// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { parseFieldCreateInput, parseFieldUpdateInput } from '@/lib/master-data/validation'

describe('field form validation', () => {
  const validPolygon = [
    { lat: 6.1, lng: 38.1 },
    { lat: 6.2, lng: 38.1 },
    { lat: 6.15, lng: 38.2 },
  ]

  it('parses a valid create payload', () => {
    const parsed = parseFieldCreateInput({
      farmerId: 'user-farmer-001',
      name: 'Plot A',
      polygon: validPolygon,
      centroid: { lat: 6.15, lng: 38.15 },
      areaSqm: 5000,
    })
    expect(parsed.farmerId).toBe('user-farmer-001')
    expect(parsed.name).toBe('Plot A')
    expect(parsed.polygon).toHaveLength(3)
    expect(parsed.centroid?.lat).toBe(6.15)
    expect(parsed.areaSqm).toBe(5000)
  })

  it('rejects polygon with fewer than three vertices on create', () => {
    expect(() =>
      parseFieldCreateInput({
        farmerId: 'user-farmer-001',
        name: 'Plot A',
        polygon: [
          { lat: 6.1, lng: 38.1 },
          { lat: 6.2, lng: 38.1 },
        ],
      }),
    ).toThrow(/at least three vertices/)
  })

  it('rejects missing field name', () => {
    expect(() =>
      parseFieldCreateInput({
        farmerId: 'user-farmer-001',
        name: '   ',
        polygon: validPolygon,
      }),
    ).toThrow()
  })

  it('parses update patch with polygon when valid', () => {
    const patch = parseFieldUpdateInput({
      polygon: validPolygon,
    })
    expect(patch.polygon).toHaveLength(3)
  })

  it('rejects polygon patch with too few vertices', () => {
    expect(() =>
      parseFieldUpdateInput({
        polygon: [
          { lat: 1, lng: 2 },
          { lat: 3, lng: 4 },
        ],
      }),
    ).toThrow(/at least three vertices/)
  })
})
