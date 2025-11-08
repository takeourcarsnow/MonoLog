import { CaptionInputField } from "./CaptionInputField";
import { SpotifyInput } from "./SpotifyInput";
import { ExifInputs } from "./ExifInputs";
import { WeatherLocationInputs } from "./WeatherLocationInputs";
import type { User } from "@/lib/types";

interface CaptionInputProps {
  caption: string;
  setCaption: (caption: string) => void;
  spotifyLink?: string;
  setSpotifyLink?: (link: string) => void;
  camera?: string;
  setCamera?: (camera: string) => void;
  lens?: string;
  setLens?: (lens: string) => void;
  filmType?: string;
  setFilmType?: (filmType: string) => void;
  filmIso?: string;
  setFilmIso?: (filmIso: string) => void;
  weatherCondition?: string;
  setWeatherCondition?: (condition: string) => void;
  weatherTemperature?: number;
  setWeatherTemperature?: (temperature: number | undefined) => void;
  locationAddress?: string;
  setLocationAddress?: (address: string) => void;
  // typed removed - this component now owns the typing animation internally
  hasPreview: boolean;
  processing: boolean;
  toast: any; // from useToast
  user?: User | null;
  setUser?: (user: User) => void;
  extractedExif?: { camera?: string; lens?: string } | null;
}

export function CaptionInput({
  caption,
  setCaption,
  spotifyLink,
  setSpotifyLink,
  camera,
  setCamera,
  lens,
  setLens,
  filmType,
  setFilmType,
  filmIso,
  setFilmIso,
  weatherCondition,
  setWeatherCondition,
  weatherTemperature,
  setWeatherTemperature,
  locationAddress,
  setLocationAddress,
  hasPreview,
  processing,
  toast,
  user,
  setUser,
  extractedExif
}: CaptionInputProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'column' }}>
      <CaptionInputField
        caption={caption}
        setCaption={setCaption}
        hasPreview={hasPreview}
        processing={processing}
      />
      <SpotifyInput
        spotifyLink={spotifyLink}
        setSpotifyLink={setSpotifyLink}
        hasPreview={hasPreview}
        processing={processing}
      />
      {/* Weather and location inputs - optional */}
      <WeatherLocationInputs
        weatherCondition={weatherCondition}
        setWeatherCondition={setWeatherCondition}
        weatherTemperature={weatherTemperature}
        setWeatherTemperature={setWeatherTemperature}
        locationAddress={locationAddress}
        setLocationAddress={setLocationAddress}
        hasPreview={hasPreview}
        processing={processing}
      />
      {/* EXIF inputs - optional */}
      <ExifInputs
        camera={camera}
        setCamera={setCamera}
        lens={lens}
        setLens={setLens}
        filmType={filmType}
        setFilmType={setFilmType}
        filmIso={filmIso}
        setFilmIso={setFilmIso}
        hasPreview={hasPreview}
        processing={processing}
        user={user}
        setUser={setUser}
        extractedExif={extractedExif}
      />
    </div>
  );
}


