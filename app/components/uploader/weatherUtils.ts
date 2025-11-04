// Weather-related constants and utilities

export const WEATHER_CONDITIONS = [
  "Sunny", "Partly Cloudy", "Cloudy", "Overcast", "Rain", "Light Rain", "Heavy Rain",
  "Snow", "Light Snow", "Heavy Snow", "Thunderstorm", "Fog", "Mist", "Haze", "Clear",
  "Windy", "Breezy", "Calm", "Hot", "Cold", "Freezing"
];

export const WEATHER_CODE_MAP: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light Drizzle',
  53: 'Moderate Drizzle',
  55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle',
  57: 'Dense Freezing Drizzle',
  61: 'Slight Rain',
  63: 'Moderate Rain',
  65: 'Heavy Rain',
  66: 'Light Freezing Rain',
  67: 'Heavy Freezing Rain',
  71: 'Slight Snow Fall',
  73: 'Moderate Snow Fall',
  75: 'Heavy Snow Fall',
  77: 'Snow Grains',
  80: 'Slight Rain Showers',
  81: 'Moderate Rain Showers',
  82: 'Violent Rain Showers',
  85: 'Slight Snow Showers',
  86: 'Heavy Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail'
};

export const parseCombinedWeather = (
  value: string,
  setWeatherCondition?: (condition: string) => void,
  setWeatherTemperature?: (temperature: number | undefined) => void
) => {
  const trimmed = value.trim();
  // Match formats like "25°C" or "25" (number only)
  const tempOnly = trimmed.match(/^(?:([-+]?[0-9]+(?:\.[0-9]+)?)(?:°C)?)$/i);
  if (tempOnly) {
    const num = parseFloat(tempOnly[1]);
    setWeatherTemperature?.(isNaN(num) ? undefined : num);
    // Do not set textual condition when only a temperature is provided
    setWeatherCondition?.('');
    return;
  }

  // Match formats like "Partly Cloudy 25°C"
  const match = trimmed.match(/^(.+?)\s+([-+]?[0-9]+(?:\.[0-9]+)?)°C$/i);
  if (match) {
    setWeatherCondition?.(match[1].trim());
    setWeatherTemperature?.(parseFloat(match[2]));
    return;
  }

  // Fallback: treat the whole value as textual condition and clear temperature
  setWeatherCondition?.(trimmed);
  setWeatherTemperature?.(undefined);
};

export const fetchWeatherForCurrentLocation = async (
  processing: boolean,
  fetchingWeather: boolean,
  setFetchingWeather: (fetching: boolean) => void,
  setWeatherTemperature?: (temperature: number | undefined) => void,
  setWeatherCondition?: (condition: string) => void,
  getCurrentPosition?: () => Promise<{ lat: number; lon: number }>
) => {
  if (processing || fetchingWeather) return;
  setFetchingWeather(true);
  try {
    const { lat, lon } = await getCurrentPosition!();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    const cw = data?.current_weather;
    if (cw) {
      const temp = typeof cw.temperature === 'number' ? cw.temperature : undefined;
      const code = typeof cw.weathercode === 'number' ? cw.weathercode : undefined;
      if (temp !== undefined) setWeatherTemperature?.(temp);
      if (code !== undefined) setWeatherCondition?.(WEATHER_CODE_MAP[code] || `Weather ${code}`);
    }
  } catch (e: any) {
    console.warn('Failed to fetch weather', e);
    try { alert('Unable to fetch weather: ' + (e?.message || e)); } catch (_) {}
  } finally {
    setFetchingWeather(false);
  }
};