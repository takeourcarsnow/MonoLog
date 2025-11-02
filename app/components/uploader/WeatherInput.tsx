import { useState, useEffect } from "react";
import { Cloud } from "lucide-react";
import { parseCombinedWeather, fetchWeatherForCurrentLocation } from "./weatherUtils";
import { getCurrentPosition } from "./locationUtils";

interface WeatherInputProps {
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  hasPreview: boolean;
  processing: boolean;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  combinedWeather: string;
  setCombinedWeather: (weather: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function WeatherInput({
  weatherCondition,
  setWeatherCondition,
  weatherTemperature,
  setWeatherTemperature,
  hasPreview,
  processing,
  activeField,
  setActiveField,
  combinedWeather,
  setCombinedWeather,
  inputRef,
}: WeatherInputProps) {
  const [fetchingWeather, setFetchingWeather] = useState(false);

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
  }, [weatherCondition, weatherTemperature, setCombinedWeather]);

  const handleCombinedWeatherChange = (value: string) => {
    setCombinedWeather(value);
    parseCombinedWeather(value, setWeatherCondition, setWeatherTemperature);
  };

  const handleCombinedWeatherBlur = () => {
    setActiveField(null);
  };

  const handleFetchWeather = () => {
    fetchWeatherForCurrentLocation(
      processing,
      fetchingWeather,
      setFetchingWeather,
      setWeatherTemperature,
      setWeatherCondition,
      getCurrentPosition
    );
  };

  if (activeField === 'combinedWeather') {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <Cloud size={16} className={`input-icon ${combinedWeather ? 'input-filled' : ''}`} />
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
              fontSize: '12px'
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleFetchWeather}
          disabled={!hasPreview || processing || fetchingWeather}
          title="Fetch current weather for this location"
          style={{
            position: 'absolute',
            left: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            border: 'none',
            background: 'transparent',
            cursor: (!hasPreview || processing || fetchingWeather) ? 'not-allowed' : 'pointer'
          }}
        >
          <Cloud size={14} className={`input-icon ${combinedWeather ? 'input-filled' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
      <input
        type="text"
        placeholder="Tap to add Weather"
        value={combinedWeather}
        onChange={(e) => handleCombinedWeatherChange(e.target.value)}
        disabled={!hasPreview || processing}
        onFocus={() => {
          if (!combinedWeather.trim()) {
            handleFetchWeather();
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
          fontSize: '12px',
          cursor: (!hasPreview || processing) ? 'not-allowed' : 'text'
        }}
      />
      <button
        type="button"
        onClick={handleFetchWeather}
        disabled={!hasPreview || processing || fetchingWeather}
        title="Fetch current weather for this location"
        style={{
          position: 'absolute',
          left: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 4,
          border: 'none',
          background: 'transparent',
          cursor: (!hasPreview || processing || fetchingWeather) ? 'not-allowed' : 'pointer'
        }}
      >
            <Cloud size={14} className={`input-icon ${combinedWeather ? 'input-filled' : ''}`} />
      </button>
    </div>
  );
}