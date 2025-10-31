import { Cloud, Thermometer } from "lucide-react";

interface WeatherSectionProps {
  showWeather: boolean;
  weatherCondition?: string;
  weatherTemperature?: number;
  weatherLocation?: string;
}

export const WeatherSection = ({ showWeather, weatherCondition, weatherTemperature, weatherLocation }: WeatherSectionProps) => {
  // Only show condition + temperature. Do not show weatherLocation here per UX request.
  if (!(weatherCondition || weatherTemperature !== undefined)) return null;

  return (
    <div className={`weather-section ${showWeather ? 'open' : ''}`}>
      <div className="weather-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px 12px', justifyContent: 'center', alignItems: 'center' }}>
          {weatherTemperature !== undefined && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Thermometer size={12} style={{ marginRight: 6 }} />{weatherTemperature}°C
            </span>
          )}
          {weatherCondition && (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Cloud size={12} style={{ marginRight: 6 }} />{weatherCondition}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};