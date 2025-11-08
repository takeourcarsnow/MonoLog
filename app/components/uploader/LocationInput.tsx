import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { fetchLocationForCurrentCoords } from "./locationUtils";

interface LocationInputProps {
  locationAddress?: string;
  setLocationAddress?: (address: string) => void;
  setWeatherCondition?: (condition: string) => void;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  hasPreview: boolean;
  processing: boolean;
  activeField: string | null;
  setActiveField: (field: string | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function LocationInput({
  locationAddress,
  setLocationAddress,
  setWeatherCondition,
  setWeatherTemperature,
  hasPreview,
  processing,
  activeField,
  setActiveField,
  inputRef,
}: LocationInputProps) {
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const handleLocationChange = (value: string) => {
    setLocationAddress?.(value);
    if (!value.trim()) {
      // Clear weather data when location is emptied
      setWeatherCondition?.('');
      setWeatherTemperature?.(undefined);
    }
  };

  const handleLocationBlur = () => {
    setActiveField(null);
  };

  const handleFetchLocation = () => {
    fetchLocationForCurrentCoords(
      processing,
      fetchingLocation,
      setFetchingLocation,
      setLocationAddress,
      () => setActiveField('location')
    );
  };

  const handleClear = () => {
    // Clear location and weather data
    setLocationAddress?.('');
    setWeatherCondition?.('');
    setWeatherTemperature?.(undefined);
    // Close any active input
    setActiveField(null);
    try { inputRef?.current?.blur(); } catch (_) {}
  };

  if (activeField === 'location') {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tap to add Location"
            value={locationAddress || ''}
            onChange={(e) => handleLocationChange(e.target.value)}
            disabled={!hasPreview || processing}
            onBlur={handleLocationBlur}
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
          onClick={handleFetchLocation}
          disabled={!hasPreview || processing || fetchingLocation}
          title="Fetch current location/address"
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
            cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
          }}
        >
              <MapPin size={14} className={`input-icon ${locationAddress ? 'input-filled' : ''}`} />
        </button>
        {locationAddress && !processing && hasPreview && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              title="Remove location"
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
        placeholder="Tap to add Location"
        value={locationAddress || ''}
        onChange={(e) => handleLocationChange(e.target.value)}
        disabled={!hasPreview || processing}
        onFocus={() => {
          if (!locationAddress?.trim()) {
            handleFetchLocation();
          } else {
            setActiveField('location');
          }
        }}
        onBlur={handleLocationBlur}
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
        onClick={handleFetchLocation}
        disabled={!hasPreview || processing || fetchingLocation}
        title="Fetch current location/address"
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
          cursor: (!hasPreview || processing || fetchingLocation) ? 'not-allowed' : 'pointer'
        }}
      >
            <MapPin size={14} className={`input-icon ${locationAddress ? 'input-filled' : ''}`} />
      </button>
      {locationAddress && !processing && hasPreview && (
        <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
          <button
            type="button"
            onClick={handleClear}
            className="clear-button"
            title="Remove location"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}