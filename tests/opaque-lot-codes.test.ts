// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  generateInternalUuid,
  generateOpaquePublicLotCode,
  generateOpaqueTraceKey,
} from '@/lib/lots/opaque-codes'

describe('opaque lot identifiers', () => {
  it('generates public lot codes with a fixed opaque pattern', () => {
    const code = generateOpaquePublicLotCode()
    expect(code).toMatch(/^PLT-[0-9A-F]{12}$/)
    expect(code).not.toMatch(/CHERRY|FIELD|FARM|LOT-/i)
  })

  it('generates trace keys with a fixed opaque pattern', () => {
    const key = generateOpaqueTraceKey()
    expect(key).toMatch(/^TRK-[0-9A-F]{10}$/)
  })

  it('generates RFC UUIDs for internalUuid', () => {
    const u = generateInternalUuid()
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('does not embed sequential business semantics in public codes across samples', () => {
    const codes = new Set<string>()
    for (let i = 0; i < 20; i++) {
      codes.add(generateOpaquePublicLotCode())
    }
    expect(codes.size).toBe(20)
  })
})
