// @vitest-environment node

import { describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_MAP_FALLBACK_CENTER,
  resolveMapCenterFromGeolocation,
} from '@/lib/fields/map-initial-view'

describe('resolveMapCenterFromGeolocation', () => {
  it('uses fallback when geolocation is missing', async () => {
    const result = await resolveMapCenterFromGeolocation(undefined, DEFAULT_MAP_FALLBACK_CENTER)
    expect(result.source).toBe('fallback')
    expect(result.lat).toBe(DEFAULT_MAP_FALLBACK_CENTER.lat)
    expect(result.lng).toBe(DEFAULT_MAP_FALLBACK_CENTER.lng)
  })

  it('uses fallback when getCurrentPosition invokes error callback', async () => {
    const geo = {
      getCurrentPosition: vi.fn((_ok: PositionCallback, err: PositionErrorCallback) => {
        err({ code: 1, message: 'denied', PERMISSION_DENIED: 1 } as GeolocationPositionError)
      }),
    }
    const customFallback = { lat: 10, lng: 20 }
    const result = await resolveMapCenterFromGeolocation(geo, customFallback)
    expect(result.source).toBe('fallback')
    expect(result.lat).toBe(10)
    expect(result.lng).toBe(20)
  })

  it('returns coordinates when geolocation succeeds', async () => {
    const geo = {
      getCurrentPosition: vi.fn((ok: PositionCallback) => {
        ok({
          coords: {
            latitude: 7.5,
            longitude: 39.25,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as GeolocationPosition)
      }),
    }
    const result = await resolveMapCenterFromGeolocation(geo, DEFAULT_MAP_FALLBACK_CENTER)
    expect(result.source).toBe('geolocation')
    expect(result.lat).toBe(7.5)
    expect(result.lng).toBe(39.25)
  })
})
