import { useState, useEffect, useRef } from "react";
import { WeatherInput } from "./WeatherInput";
import { LocationInput } from "./LocationInput";

interface WeatherLocationInputsProps {
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
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
  locationAddress,
  setLocationAddress,
  hasPreview,
  processing,
}: WeatherLocationInputsProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [combinedWeather, setCombinedWeather] = useState<string>('');

  // Update combined weather when condition or temperature changes
  useEffect(() => {
    // Only display temperature in the combined string; the icon will represent condition
    if (weatherTemperature !== undefined) {
      setCombinedWeather(`${Math.round(weatherTemperature)}°C`);
    } else {
      setCombinedWeather('');
    }
  }, [weatherCondition, weatherTemperature]);

  useEffect(() => {
    if (activeField && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      requestAnimationFrame(() => {
        inputRef.current?.select();
      });
    }
  }, [activeField]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8, flexWrap: 'wrap' }}>
      {activeField === null ? (
        // Show all fields when none is active (Location first, then Weather)
        <>
          <LocationInput
            locationAddress={locationAddress}
            setLocationAddress={setLocationAddress}
            hasPreview={hasPreview}
            processing={processing}
            activeField={activeField}
            setActiveField={setActiveField}
            inputRef={inputRef}
          />
          <WeatherInput
            weatherCondition={weatherCondition}
            setWeatherCondition={setWeatherCondition}
            weatherTemperature={weatherTemperature}
            setWeatherTemperature={setWeatherTemperature}
            hasPreview={hasPreview}
            processing={processing}
            activeField={activeField}
            setActiveField={setActiveField}
            combinedWeather={combinedWeather}
            setCombinedWeather={setCombinedWeather}
            inputRef={inputRef}
          />
        </>
      ) : (
        // Show only the active field in full width
        <div style={{ width: '100%' }}>
          {activeField === 'combinedWeather' && (
            <WeatherInput
              weatherCondition={weatherCondition}
              setWeatherCondition={setWeatherCondition}
              weatherTemperature={weatherTemperature}
              setWeatherTemperature={setWeatherTemperature}
              hasPreview={hasPreview}
              processing={processing}
              activeField={activeField}
              setActiveField={setActiveField}
              combinedWeather={combinedWeather}
              setCombinedWeather={setCombinedWeather}
              inputRef={inputRef}
            />
          )}
          {activeField === 'location' && (
            <LocationInput
              locationAddress={locationAddress}
              setLocationAddress={setLocationAddress}
              hasPreview={hasPreview}
              processing={processing}
              activeField={activeField}
              setActiveField={setActiveField}
              inputRef={inputRef}
            />
          )}
        </div>
      )}
    </div>
  );
}