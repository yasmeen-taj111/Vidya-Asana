// Vidya Asana — Geocoding & Location Extraction Service
// Supports OpenStreetMap Nominatim, Photon, and Mapbox Geocoding

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface GeocodeOptions {
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Geocodes an address query to extract latitude and longitude.
 * Prioritizes Mapbox if VITE_MAPBOX_TOKEN is configured in environment,
 * otherwise seamlessly uses OpenStreetMap Nominatim with Photon fallback.
 */
export async function geocodeAddress(
  query: string,
  options?: GeocodeOptions
): Promise<GeocodingResult | null> {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // 1. Try Mapbox if API token is configured
  if (mapboxToken) {
    try {
      const fullQuery = [query, options?.city, options?.state, options?.postalCode, options?.country || 'India']
        .filter(Boolean)
        .join(', ');

      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullQuery)}.json?access_token=${mapboxToken}&limit=1`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const [lng, lat] = feature.center;
          return {
            lat,
            lng,
            displayName: feature.place_name,
          };
        }
      }
    } catch (err) {
      console.warn('[Geocoding] Mapbox query failed, falling back to OpenStreetMap:', err);
    }
  }

  // 2. Query OpenStreetMap Nominatim API (Primary accurate global service)
  try {
    const parts = [query, options?.city, options?.state, options?.postalCode, options?.country || 'India']
      .filter(Boolean)
      .join(', ');

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(parts)}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'VidyaAsanaLibraryNetwork/1.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          return {
            lat,
            lng,
            displayName: item.display_name,
            city: item.address?.city || item.address?.town || item.address?.village || options?.city,
            state: item.address?.state || options?.state,
            postcode: item.address?.postcode || options?.postalCode,
            country: item.address?.country || 'India',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Geocoding] Nominatim query failed, trying Photon fallback:', err);
  }

  // 3. Fallback to Photon (Fast OpenStreetMap-based geocoding engine)
  try {
    const fallbackQuery = [query, options?.city, options?.state].filter(Boolean).join(' ');
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(fallbackQuery)}&limit=1`
    );

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.geometry.coordinates;
        if (!isNaN(lat) && !isNaN(lng)) {
          const props = feature.properties || {};
          return {
            lat,
            lng,
            displayName: `${props.name || ''} ${props.street || ''}, ${props.city || ''}`.trim() || fallbackQuery,
            city: props.city || options?.city,
            state: props.state || options?.state,
            postcode: props.postcode || options?.postalCode,
            country: props.country || 'India',
          };
        }
      }
    }
  } catch (err) {
    console.error('[Geocoding] All geocoding services failed:', err);
  }

  return null;
}

/**
 * Reverse geocodes latitude and longitude into human-readable address.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ displayName: string; city?: string; state?: string; postcode?: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'VidyaAsanaLibraryNetwork/1.0',
        },
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return {
          displayName: data.display_name,
          city: data.address?.city || data.address?.town || data.address?.suburb,
          state: data.address?.state,
          postcode: data.address?.postcode,
        };
      }
    }
  } catch (err) {
    console.warn('[Geocoding] Reverse geocoding failed:', err);
  }

  return null;
}
