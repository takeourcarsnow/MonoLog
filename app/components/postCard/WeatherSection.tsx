import { Cloud, Thermometer, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle } from "lucide-react";

function getWeatherIcon(condition: string) {
  const lower = condition.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) return Sun;
  if (lower.includes('rain') || lower.includes('shower')) return CloudRain;
  if (lower.includes('snow') || lower.includes('freezing')) return CloudSnow;
  if (lower.includes('thunder') || lower.includes('storm')) return CloudLightning;
  if (lower.includes('drizzle')) return CloudDrizzle;
  if (lower.includes('fog') || lower.includes('overcast') || lower.includes('cloud')) return Cloud;
  return Cloud; // default
}

interface WeatherSectionProps {
  showWeather: boolean;
  weatherCondition?: string;
  weatherTemperature?: number;
  weatherLocation?: string;
}

export const WeatherSection = ({ showWeather, weatherCondition, weatherTemperature, weatherLocation }: WeatherSectionProps) => {
  // Only show temperature with relevant icon. Do not show weatherLocation here per UX request.
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