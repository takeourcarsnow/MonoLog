import { MapPin } from "lucide-react";

interface LocationSectionProps {
  showLocation: boolean;
  locationLatitude?: number;
  locationLongitude?: number;
  locationAddress?: string;
}

export const LocationSection = ({ showLocation, locationLatitude, locationLongitude, locationAddress }: LocationSectionProps) => {
  // Only show a small, friendly city/town label when location is toggled on.
  // Prefer a dedicated short `city` value (weatherLocation) if available on the post
  // otherwise fallback to the first segment of the full address.
  if (!(locationLatitude !== undefined || locationLongitude !== undefined || locationAddress)) return null;

  const city = (() => {
    if (!locationAddress) return undefined;
    try {
      // Nominatim-style display_name is comma-separated; use the first segment
      const first = locationAddress.split(',')[0]?.trim();
      return first || undefined;
    } catch (_) {
      return undefined;
    }
  })();

  return (
    <div className={`location-section ${showLocation ? 'open' : ''}`}>
      <div className="location-info" style={{ marginTop: 8, fontSize: 14, color: 'var(--text)', background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px 12px', justifyContent: 'center', alignItems: 'center' }}>
          {city ? (
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              <MapPin size={12} style={{ marginRight: 6 }} />{city}
            </span>
          ) : (
            // Fallback: if no address string exists, show nothing (we intentionally
            // avoid showing raw lat/lng or full address per UX request)
            null
          )}
        </div>
      </div>
    </div>
  );
};