import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Moon } from "lucide-react";

export function getWeatherIcon(condition: string, date?: Date) {
  const lower = condition.toLowerCase();
  const d = date || new Date();
  const isNight = d.getHours() < 6 || d.getHours() > 18;
  if (!condition.trim()) return Cloud;
  if (isNight) return Moon;
  if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle') || lower.includes('thunder') || lower.includes('storm')) return CloudRain;
  if (lower.includes('snow') || lower.includes('freezing')) return CloudSnow;
  if (lower.includes('clear') || lower.includes('sunny') || lower.includes('mainly clear')) return Sun;
  return Cloud; // default for cloud, fog, overcast, etc.
}