import { useState } from "react";
import { MapPin } from "lucide-react";
import { fetchLocationForCurrentCoords } from "./locationUtils";

interface LocationInputProps {
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
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function LocationInput({
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
  activeField,
  setActiveField,
  inputRef,
}: LocationInputProps) {
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleWeatherLocationChange = (value: string) => {
    setWeatherLocation?.(value);
  };

  const handleWeatherLocationBlur = () => {
    setActiveField(null);
  };

  const handleFetchLocation = () => {
    fetchLocationForCurrentCoords(
      processing,
      fetchingLocation,
      setFetchingLocation,
      setLocationLatitude,
      setLocationLongitude,
      setLocationAddress,
      setWeatherLocation
    );
  };

  if (activeField === 'weatherLocation') {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            <MapPin size={16} className={`input-icon ${weatherLocation ? 'input-filled' : ''}`} />
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
              fontSize: '12px'
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleFetchLocation}
          disabled={!hasPreview || processing || fetchingLocation}
          title="Fetch current location/address"
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
            cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
          }}
        >
              <MapPin size={14} className={`input-icon ${weatherLocation ? 'input-filled' : ''}`} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
      <input
        type="text"
        placeholder="Tap to add Location"
        value={weatherLocation || ''}
        onChange={(e) => handleWeatherLocationChange(e.target.value)}
        disabled={!hasPreview || processing}
        onFocus={() => {
          if (!weatherLocation?.trim()) {
            handleFetchLocation();
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
          fontSize: '12px',
          cursor: (!hasPreview || processing) ? 'not-allowed' : 'text'
        }}
      />
      <button
        type="button"
        onClick={handleFetchLocation}
        disabled={!hasPreview || processing || fetchingLocation}
        title="Fetch current location/address"
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
          cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
        }}
      >
            <MapPin size={14} className={`input-icon ${weatherLocation ? 'input-filled' : ''}`} />
      </button>
    </div>
  );
}