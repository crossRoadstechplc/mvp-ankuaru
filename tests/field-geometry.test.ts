// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { findOtherFarmerOverlappingField } from '@/lib/fields/field-overlap'
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

describe('findOtherFarmerOverlappingField', () => {
  const otherFarmerPlot = {
    id: 'field-other',
    farmerId: 'farmer-b',
    name: 'Neighbor plot',
    polygon: [
      { lat: 1, lng: 1 },
      { lat: 3, lng: 1 },
      { lat: 3, lng: 3 },
      { lat: 1, lng: 3 },
    ],
  }

  it('returns undefined when only the same farmer overlaps', () => {
    const mine = [
      { lat: 1.5, lng: 1.5 },
      { lat: 2.5, lng: 1.5 },
      { lat: 2.5, lng: 2.5 },
      { lat: 1.5, lng: 2.5 },
    ]
    const sameFarmer = { ...otherFarmerPlot, id: 'field-mine', farmerId: 'farmer-a', name: 'My other plot' }
    expect(findOtherFarmerOverlappingField(mine, 'farmer-a', undefined, [sameFarmer])).toBeUndefined()
  })

  it('detects intersection with another farmer field', () => {
    const crossesNeighbor = [
      { lat: 2, lng: 2 },
      { lat: 4, lng: 2 },
      { lat: 4, lng: 4 },
      { lat: 2, lng: 4 },
    ]
    const hit = findOtherFarmerOverlappingField(crossesNeighbor, 'farmer-a', undefined, [otherFarmerPlot])
    expect(hit?.id).toBe('field-other')
  })

  it('excludes the active field id on edit', () => {
    const poly = otherFarmerPlot.polygon
    expect(findOtherFarmerOverlappingField(poly, 'farmer-b', 'field-other', [otherFarmerPlot])).toBeUndefined()
  })
})
