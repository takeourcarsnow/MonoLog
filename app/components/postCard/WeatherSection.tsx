import { Cloud, Thermometer, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Moon } from "lucide-react";
import { getWeatherIcon } from "@/lib/weatherIcons";

interface WeatherSectionProps {
  showWeather: boolean;
  weatherCondition?: string;
  weatherTemperature?: number;
}

export const WeatherSection = ({ showWeather, weatherCondition, weatherTemperature }: WeatherSectionProps) => {
  // Only show temperature with relevant icon.
  if (weatherTemperature === undefined) return null;

  return (
    <div className={`weather-section ${showWeather ? 'open' : ''}`}>
      <div className="weather-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px 12px', justifyContent: 'center', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            {(() => {
              const IconComponent = getWeatherIcon(weatherCondition || '');
              return <IconComponent size={12} style={{ marginRight: 6 }} />;
            })()}
            {weatherTemperature}°C
          </span>
        </div>
      </div>
    </div>
  );
};