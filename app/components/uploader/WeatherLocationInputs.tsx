import { useState, useEffect, useRef } from "react";
import { Combobox } from "../Combobox";
import { Cloud, MapPin, Thermometer } from "lucide-react";

interface WeatherLocationInputsProps {
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  weatherLocation?: string;
  setWeatherLocation?: (location: string) => void;
  locationLatitude?: number;
  setLocationLatitude?: (latitude: number | undefined) => void;
  locationLongitude?: number;
  setLocationLongitude?: (longitude: number | undefined) => void;
  locationAddress?: string;
  setLocationAddress?: (address: string) => void;
  hasPreview: boolean;
  processing: boolean;
}

export function WeatherLocationInputs({
  weatherCondition,
  setWeatherCondition,
  weatherTemperature,
  setWeatherTemperature,
  weatherLocation,
  setWeatherLocation,
  locationLatitude,
  setLocationLatitude,
  locationLongitude,
  setLocationLongitude,
  locationAddress,
  setLocationAddress,
  hasPreview,
  processing,
}: WeatherLocationInputsProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [combinedWeather, setCombinedWeather] = useState<string>('');

  // Update combined weather when condition or temperature changes
  useEffect(() => {
    if (weatherCondition && weatherTemperature !== undefined) {
      setCombinedWeather(`${weatherCondition} ${Math.round(weatherTemperature)}°C`);
    } else if (weatherCondition) {
      setCombinedWeather(weatherCondition);
    } else if (weatherTemperature !== undefined) {
      setCombinedWeather(`${Math.round(weatherTemperature)}°C`);
    } else {
      setCombinedWeather('');
    }
  }, [weatherCondition, weatherTemperature]);

  // Parse combined weather input
  const parseCombinedWeather = (value: string) => {
    const match = value.match(/^(.+?)\s+(\d+(?:\.\d+)?)°C$/);
    if (match) {
      setWeatherCondition?.(match[1].trim());
      setWeatherTemperature?.(parseFloat(match[2]));
    } else {
      setWeatherCondition?.(value.trim());
      setWeatherTemperature?.(undefined);
    }
  };

  useEffect(() => {
    if (activeField && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [activeField]);

  // Common weather conditions
  const WEATHER_CONDITIONS = [
    "Sunny", "Partly Cloudy", "Cloudy", "Overcast", "Rain", "Light Rain", "Heavy Rain",
    "Snow", "Light Snow", "Heavy Snow", "Thunderstorm", "Fog", "Mist", "Haze", "Clear",
    "Windy", "Breezy", "Calm", "Hot", "Cold", "Freezing"
  ];

  const handleCombinedWeatherChange = (value: string) => {
    setCombinedWeather(value);
    parseCombinedWeather(value);
  };

  const handleCombinedWeatherBlur = () => {
    setActiveField(null);
  };

  const handleWeatherLocationChange = (value: string) => {
    setWeatherLocation?.(value);
  };

  const handleWeatherLocationBlur = () => {
    setActiveField(null);
  };

  // Helper: get current position via browser geolocation (wrapped in a Promise)
  const getCurrentPosition = (): Promise<{ lat: number; lon: number }> => {
    // Try navigator.geolocation first; if it fails due to permissions or
    // policies (e.g., embedded in an iframe) fall back to an IP-based lookup.
    const ipFallback = async (): Promise<{ lat: number; lon: number }> => {
      try {
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) throw new Error('IP lookup failed');
        const j = await r.json();
        const latRaw = j.latitude ?? j.lat ?? j.latitute ?? j.latitiude ?? null;
        const lonRaw = j.longitude ?? j.lon ?? j.long ?? null;
        const lat = parseFloat(String(latRaw ?? NaN));
        const lon = parseFloat(String(lonRaw ?? NaN));
        if (isNaN(lat) || isNaN(lon)) throw new Error('IP lookup returned no coords');
        return { lat, lon };
      } catch (e) {
        throw new Error('Failed to retrieve location from IP fallback');
      }
    };

    return new Promise(async (resolve, reject) => {
      // First, try the Permissions API to avoid triggering a permissions-policy
      // violation or browser prompt in contexts that disallow geolocation (e.g., framed pages).
      try {
        if (navigator?.permissions && typeof navigator.permissions.query === 'function') {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          // If explicitly denied, don't call getCurrentPosition (it may be blocked by policy)
          if (status.state === 'denied') {
            const fb = await ipFallback();
            resolve(fb);
            return;
          }
          // If prompt or granted, fall through and attempt geolocation which may prompt the user
        }
      } catch (e) {
        // Permissions API may be unavailable or throw in some environments — fallthrough to trying geolocation
        // but we'll handle failures by using the IP fallback.
        // Do nothing here; continue to attempt navigator.geolocation below.
      }

      if (!navigator?.geolocation) {
        // No geolocation available in this environment — try IP fallback
        ipFallback().then(resolve).catch(reject);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        async (err) => {
          // If geolocation failed (denied, blocked, or otherwise), try IP fallback
          console.warn('Geolocation failed, attempting IP fallback', err);
          try {
            const fb = await ipFallback();
            resolve(fb);
          } catch (e) {
            reject(err);
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  // Minimal mapping for Open-Meteo weather codes to human readable labels
  const WEATHER_CODE_MAP: Record<number, string> = {
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

  async function fetchWeatherForCurrentLocation() {
    if (processing || fetchingWeather) return;
    setFetchingWeather(true);
    try {
      const { lat, lon } = await getCurrentPosition();
      // Open-Meteo current weather endpoint (no API key required)
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
  }

  async function fetchLocationForCurrentCoords() {
    if (processing || fetchingLocation) return;
    setFetchingLocation(true);
    try {
      const { lat, lon } = await getCurrentPosition();
      setLocationLatitude?.(lat);
      setLocationLongitude?.(lon);
      const addr = await reverseGeocode(lat, lon);
      if (addr) {
        setLocationAddress?.(addr.display_name || addr.name || '');
        const city = addr.address?.city || addr.address?.town || addr.address?.village || addr.address?.county || addr.address?.state;
        if (city) setWeatherLocation?.(city);
      }
    } catch (e: any) {
      console.warn('Failed to fetch location', e);
      try { alert('Unable to fetch location: ' + (e?.message || e)); } catch (_) {}
    } finally {
      setFetchingLocation(false);
    }
  }

  // Reverse geocode using Nominatim (OpenStreetMap) - lightweight and no API key
  async function reverseGeocode(lat: number, lon: number): Promise<any | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch (e) {
      return null;
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8 }}>
      {activeField === null ? (
        // Show all fields when none is active
        <>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Tap to add Weather"
              value={combinedWeather}
              onChange={(e) => handleCombinedWeatherChange(e.target.value)}
              disabled={!hasPreview || processing}
              onFocus={() => {
                if (!combinedWeather.trim()) {
                  fetchWeatherForCurrentLocation();
                } else {
                  setActiveField('combinedWeather');
                }
              }}
              onBlur={handleCombinedWeatherBlur}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: (!hasPreview || processing) ? 'not-allowed' : 'text'
              }}
            />
            <button
              type="button"
              onClick={fetchWeatherForCurrentLocation}
              disabled={!hasPreview || processing || fetchingWeather}
              title="Fetch current weather for this location"
              style={{
                position: 'absolute',
                left: 8,
                top: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                border: 'none',
                background: 'transparent',
                cursor: (!hasPreview || processing || fetchingWeather) ? 'not-allowed' : 'pointer'
              }}
            >
              <Cloud size={14} />
            </button>
          </div>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Tap to add Location"
              value={weatherLocation || ''}
              onChange={(e) => handleWeatherLocationChange(e.target.value)}
              disabled={!hasPreview || processing}
              onFocus={() => {
                if (!weatherLocation?.trim()) {
                  fetchLocationForCurrentCoords();
                } else {
                  setActiveField('weatherLocation');
                }
              }}
              onBlur={handleWeatherLocationBlur}
              style={{
                width: '100%',
                padding: '8px 12px 8px 40px',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                cursor: (!hasPreview || processing) ? 'not-allowed' : 'text'
              }}
            />
            <button
              type="button"
              onClick={fetchLocationForCurrentCoords}
              disabled={!hasPreview || processing || fetchingLocation}
              title="Fetch current location/address"
              style={{
                position: 'absolute',
                left: 8,
                top: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                border: 'none',
                background: 'transparent',
                cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
              }}
            >
              <MapPin size={14} />
            </button>
          </div>
        </>
      ) : (
        // Show only the active field in full width
        <div style={{ width: '100%' }}>
          {activeField === 'combinedWeather' && (
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <Cloud size={16} style={{ color: 'var(--dim)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Weather condition and temperature (e.g., Sunny 25°C)"
                  value={combinedWeather}
                  onChange={(e) => handleCombinedWeatherChange(e.target.value)}
                  disabled={!hasPreview || processing}
                  onBlur={handleCombinedWeatherBlur}
                  style={{
                    flex: 1,
                    padding: '8px 12px 8px 40px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={fetchWeatherForCurrentLocation}
                disabled={!hasPreview || processing || fetchingWeather}
                title="Fetch current weather for this location"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: (!hasPreview || processing || fetchingWeather) ? 'not-allowed' : 'pointer'
                }}
              >
                <Cloud size={14} />
              </button>
            </div>
          )}
          {activeField === 'weatherLocation' && (
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                <MapPin size={16} style={{ color: 'var(--dim)' }} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Tap to add Location"
                  value={weatherLocation || ''}
                  onChange={(e) => handleWeatherLocationChange(e.target.value)}
                  disabled={!hasPreview || processing}
                  onBlur={handleWeatherLocationBlur}
                  style={{
                    flex: 1,
                    padding: '8px 12px 8px 40px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={fetchLocationForCurrentCoords}
                disabled={!hasPreview || processing || fetchingLocation}
                title="Fetch current location/address"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  border: 'none',
                  background: 'transparent',
                  cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
                }}
              >
                <MapPin size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}