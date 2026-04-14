/**
 * Default center near seeded Yirgacheffe demo data when geolocation is unavailable.
 */
export const DEFAULT_MAP_FALLBACK_CENTER = { lat: 6.179, lng: 38.2026 }

/** Initial zoom when center comes from browser geolocation (closer than seeded-area default). */
export const DISTRIBUTION_MAP_GEOLOCATION_ZOOM = 17

/** Initial zoom when geolocation is unavailable and the demo fallback center is used. */
export const DISTRIBUTION_MAP_FALLBACK_ZOOM = 13

export type MapCenterResolution = {
  lat: number
  lng: number
  source: 'geolocation' | 'fallback'
}

/**
 * Resolves an initial map center: try browser geolocation, then fall back.
 * Injectable `geolocation` enables tests and SSR-safe usage.
 */
export const resolveMapCenterFromGeolocation = async (
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined,
  fallback: { lat: number; lng: number } = DEFAULT_MAP_FALLBACK_CENTER,
): Promise<MapCenterResolution> => {
  if (!geolocation || typeof geolocation.getCurrentPosition !== 'function') {
    return { lat: fallback.lat, lng: fallback.lng, source: 'fallback' }
  }

  return await new Promise((resolve) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          source: 'geolocation',
        })
      },
      () => {
        resolve({ lat: fallback.lat, lng: fallback.lng, source: 'fallback' })
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    )
  })
}
