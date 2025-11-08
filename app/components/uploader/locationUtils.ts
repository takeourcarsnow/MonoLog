// Location-related utilities

export const getCurrentPosition = (): Promise<{ lat: number; lon: number }> => {
  // HTTPS IP geolocation fallback (no key required). ipapi.com requires a key; ipapi.co works over HTTPS.
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
      // Skip permissions check to avoid false denials
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
    } catch (e) {
      ipFallback().then(resolve).catch(reject);
    }
  });
};

export const reverseGeocode = async (lat: number, lon: number): Promise<any | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=jsonv2`;
    // Note: Browsers will ignore a custom User-Agent header. We rely on Referer + default UA.
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`Reverse geocoding failed: HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (e) {
    throw e;
  }
};

// Build a concise, human-friendly label from a Nominatim reverse geocode result
const buildLocationLabel = (addr: any): string => {
  if (!addr) return '';
  const a = addr.address || {};
  // Prefer specific localities
  const cityLike = a.city || a.town || a.village || a.municipality || a.locality || a.suburb || a.neighbourhood || a.hamlet || a.county || a.state;
  // Only return the city
  return cityLike ? String(cityLike) : '';
};

export const fetchLocationForCurrentCoords = async (
  processing: boolean,
  fetchingLocation: boolean,
  setFetchingLocation: (fetching: boolean) => void,
  setLocationAddress?: (address: string) => void,
  onSuccess?: () => void
) => {
  if (processing || fetchingLocation) return;
  setFetchingLocation(true);
  try {
    // Use unified position getter with IP fallback
    const { lat, lon } = await getCurrentPosition();
    // For privacy, we don't store lat/lon - only get the city
    const addr = await reverseGeocode(lat, lon);
    if (addr) {
      // Only store the city for privacy
      const city = buildLocationLabel(addr);
      if (city) {
        setLocationAddress?.(city);
        onSuccess?.();
      }
      try { if (process.env.NODE_ENV !== 'production') console.debug('[uploader] reverse-geocode', { lat, lon, city }); } catch (_) {}
    }
  } catch (e: any) {
    console.warn('Failed to fetch location', e);
    try { alert('Unable to fetch location: ' + (e?.message || e)); } catch (_) {}
  } finally {
    setFetchingLocation(false);
  }
};