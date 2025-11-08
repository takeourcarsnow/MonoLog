import { useState, useEffect } from "react";
import { Cloud, X } from "lucide-react";
import { parseCombinedWeather, fetchWeatherForCurrentLocation } from "./weatherUtils";
import { getCurrentPosition } from "./locationUtils";
import { getWeatherIcon } from "@/lib/weatherIcons";

interface WeatherInputProps {
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  setLocationAddress?: (address: string) => void;
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
  setLocationAddress,
  hasPreview,
  processing,
  activeField,
  setActiveField,
  combinedWeather,
  setCombinedWeather,
  inputRef,
}: WeatherInputProps) {
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const IconComponent = getWeatherIcon(weatherCondition || '');

  const handleCombinedWeatherChange = (value: string) => {
    setCombinedWeather(value);
    if (!value.trim()) {
      // Clear location when weather is emptied
      setLocationAddress?.('');
    }
  };

  const handleCombinedWeatherBlur = () => {
    setActiveField(null);
    // Parse and format on blur
    parseCombinedWeather(combinedWeather, setWeatherCondition, setWeatherTemperature);
    if (weatherTemperature !== undefined) {
      setCombinedWeather(`${Math.round(weatherTemperature)}°C`);
    } else {
      setCombinedWeather('');
    }
  };

  const handleFetchWeather = () => {
    fetchWeatherForCurrentLocation(
      processing,
      fetchingWeather,
      setFetchingWeather,
      setWeatherTemperature,
      setWeatherCondition,
      setCombinedWeather,
      getCurrentPosition
    );
  };

  const handleClear = () => {
    setWeatherCondition?.('');
    setWeatherTemperature?.(undefined);
    setLocationAddress?.('');
    setCombinedWeather('');
    setActiveField(null);
    try { inputRef?.current?.blur(); } catch (_) {}
  };

  if (activeField === 'combinedWeather') {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Temperature (e.g., 25°C)"
            value={combinedWeather}
            onChange={(e) => handleCombinedWeatherChange(e.target.value)}
            disabled={!hasPreview || processing}
            onBlur={handleCombinedWeatherBlur}
            onFocus={(e) => {}}
            style={{
              flex: 1,
              padding: '8px 12px 8px 32px',
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
            left: 2,
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
          <IconComponent size={14} className={`input-icon ${combinedWeather ? 'input-filled' : ''}`} />
        </button>
        {combinedWeather && !processing && hasPreview && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              title="Remove weather info"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
      <input
        type="text"
        placeholder="Tap to add temperature"
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
          padding: '8px 12px 8px 32px',
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
        title="Fetch current temperature for this location"
        style={{
          position: 'absolute',
          left: 2,
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
            <IconComponent size={14} className={`input-icon ${combinedWeather ? 'input-filled' : ''}`} />
      </button>
      {combinedWeather && !processing && hasPreview && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            title="Remove weather info"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}