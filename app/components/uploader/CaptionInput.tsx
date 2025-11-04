import { CaptionTextarea } from "./CaptionTextarea";
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
  weatherLocation?: string;
  setWeatherLocation?: (location: string) => void;
  locationLatitude?: number;
  setLocationLatitude?: (latitude: number | undefined) => void;
  locationLongitude?: number;
  setLocationLongitude?: (longitude: number | undefined) => void;
  locationAddress?: string;
  setLocationAddress?: (address: string) => void;
  // typed removed - this component now owns the typing animation internally
  captionFocused: boolean;
  setCaptionFocused: (focused: boolean) => void;
  hasPreview: boolean;
  processing: boolean;
  CAPTION_MAX: number;
  toast: any; // from useToast
  user?: User | null;
  setUser?: (user: User) => void;
}

export function CaptionInput({
  caption,
  setCaption,
  captionFocused,
  setCaptionFocused,
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
  CAPTION_MAX,
  toast,
  user,
  setUser
}: CaptionInputProps) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexDirection: 'column' }}>
      <CaptionTextarea
        caption={caption}
        setCaption={setCaption}
        captionFocused={captionFocused}
        setCaptionFocused={setCaptionFocused}
        hasPreview={hasPreview}
        processing={processing}
        CAPTION_MAX={CAPTION_MAX}
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
      />
    </div>
  );
}


