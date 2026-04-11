// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  buildFieldGeometryPayload,
  computePolygonAreaSqm,
  computePolygonCentroid,
  normalizePolygonRing,
  polygonPointsFromLeafletRing,
} from '@/lib/fields/geometry'

describe('field geometry helpers', () => {
  it('normalizes duplicate closing vertex', () => {
    const ring = [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 4 },
      { lat: 5, lng: 6 },
      { lat: 1, lng: 2 },
    ]
    expect(normalizePolygonRing(ring)).toHaveLength(3)
  })

  it('serializes leaflet-like latlng objects', () => {
    const pts = polygonPointsFromLeafletRing([
      { lat: 6.1, lng: 38.1 },
      { lat: 6.2, lng: 38.1 },
      { lat: 6.15, lng: 38.2 },
      { lat: 6.1, lng: 38.1 },
    ])
    expect(pts).toHaveLength(3)
  })

  it('computes centroid as vertex mean', () => {
    const c = computePolygonCentroid([
      { lat: 0, lng: 0 },
      { lat: 2, lng: 0 },
      { lat: 0, lng: 2 },
    ])
    expect(c.lat).toBeCloseTo(2 / 3, 5)
    expect(c.lng).toBeCloseTo(2 / 3, 5)
  })

  it('computes positive area for a simple triangle', () => {
    const area = computePolygonAreaSqm([
      { lat: 6.179, lng: 38.202 },
      { lat: 6.180, lng: 38.202 },
      { lat: 6.1795, lng: 38.203 },
    ])
    expect(area).toBeGreaterThan(0)
    expect(Number.isFinite(area)).toBe(true)
  })

  it('buildFieldGeometryPayload returns consistent polygon, centroid, and area', () => {
    const payload = buildFieldGeometryPayload([
      { lat: 6.1, lng: 38.1 },
      { lat: 6.2, lng: 38.1 },
      { lat: 6.15, lng: 38.2 },
    ])
    expect(payload.polygon).toHaveLength(3)
    expect(payload.centroid).toBeDefined()
    expect(payload.areaSqm).toBeGreaterThan(0)
  })
})
