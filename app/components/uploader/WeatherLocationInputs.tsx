import { useState, useEffect, useRef } from "react";
import { WeatherInput } from "./WeatherInput";
import { LocationInput } from "./LocationInput";

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

  useEffect(() => {
    if (activeField && inputRef.current) {
      inputRef.current.focus();
      // Select all text for easy replacement
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [activeField]);

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', marginTop: 8, flexWrap: 'wrap' }}>
      {activeField === null ? (
        // Show all fields when none is active (Location first, then Weather)
        <>
          <LocationInput
            weatherLocation={weatherLocation}
            setWeatherLocation={setWeatherLocation}
            locationLatitude={locationLatitude}
            setLocationLatitude={setLocationLatitude}
            locationLongitude={locationLongitude}
            setLocationLongitude={setLocationLongitude}
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
          {activeField === 'weatherLocation' && (
            <LocationInput
              weatherLocation={weatherLocation}
              setWeatherLocation={setWeatherLocation}
              locationLatitude={locationLatitude}
              setLocationLatitude={setLocationLatitude}
              locationLongitude={locationLongitude}
              setLocationLongitude={setLocationLongitude}
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