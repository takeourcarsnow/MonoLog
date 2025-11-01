// Location-related utilities

export const getCurrentPosition = (): Promise<{ lat: number; lon: number }> => {
  const ipFallback = async (): Promise<{ lat: number; lon: number }> => {
    try {
      const r = await fetch('https://ipapi.co/json/');
      if (!r.ok) throw new Error('IP lookup failed');
      const j = await r.json();
      const latRaw = j.latitude ?? j.lat ?? j.latitute ?? j.latitiude ?? null;
      const lonRaw = j.longitude ?? j.lon ?? j.long ?? null;
      const lat = parseFloat(String(latRaw ?? NaN));
      const lon = parseFloat(String(lonRaw ?? NaN));
      if (isNaN(lat) || isNaN(lon)) throw new Error('IP lookup returned no coords');
      return { lat, lon };
    } catch (e) {
      throw new Error('Failed to retrieve location from IP fallback');
    }
  };

  return new Promise(async (resolve, reject) => {
    try {
      if (navigator?.permissions && typeof navigator.permissions.query === 'function') {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'denied') {
          const fb = await ipFallback();
          resolve(fb);
          return;
        }
      }
    } catch (e) {
      // Permissions API may be unavailable or throw in some environments — fallthrough to trying geolocation
    }

    if (!navigator?.geolocation) {
      ipFallback().then(resolve).catch(reject);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      async (err) => {
        console.warn('Geolocation failed, attempting IP fallback', err);
        try {
          const fb = await ipFallback();
          resolve(fb);
        } catch (e) {
          reject(err);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

export const reverseGeocode = async (lat: number, lon: number): Promise<any | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch (e) {
    return null;
  }
};

export const fetchLocationForCurrentCoords = async (
  processing: boolean,
  fetchingLocation: boolean,
  setFetchingLocation: (fetching: boolean) => void,
  setLocationLatitude?: (latitude: number | undefined) => void,
  setLocationLongitude?: (longitude: number | undefined) => void,
  setLocationAddress?: (address: string) => void,
  setWeatherLocation?: (location: string) => void
) => {
  if (processing || fetchingLocation) return;
  setFetchingLocation(true);
  try {
    const { lat, lon } = await getCurrentPosition();
    setLocationLatitude?.(lat);
    setLocationLongitude?.(lon);
    const addr = await reverseGeocode(lat, lon);
    if (addr) {
      setLocationAddress?.(addr.display_name || addr.name || '');
      const city = addr.address?.city || addr.address?.town || addr.address?.village || addr.address?.county || addr.address?.state;
      if (city) setWeatherLocation?.(city);
    }
  } catch (e: any) {
    console.warn('Failed to fetch location', e);
    try { alert('Unable to fetch location: ' + (e?.message || e)); } catch (_) {}
  } finally {
    setFetchingLocation(false);
  }
};