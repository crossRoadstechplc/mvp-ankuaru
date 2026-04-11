import { describe, expect, it } from 'vitest'

import type { CommercialContext } from '@/lib/permissions/commercial-context'
import { roleSeesCommercialInContext } from '@/lib/permissions/commercial-context'

describe('roleSeesCommercialInContext', () => {
  it('allows importer in trade_discovery but not physical_truth', () => {
    expect(roleSeesCommercialInContext('importer', 'trade_discovery' as CommercialContext)).toBe(true)
    expect(roleSeesCommercialInContext('importer', 'physical_truth' as CommercialContext)).toBe(false)
  })

  it('never allows commercial fields in regulator_oversight', () => {
    expect(roleSeesCommercialInContext('bank', 'regulator_oversight' as CommercialContext)).toBe(false)
    expect(roleSeesCommercialInContext('admin', 'regulator_oversight' as CommercialContext)).toBe(false)
  })

  it('allows bank in physical_truth', () => {
    expect(roleSeesCommercialInContext('bank', 'physical_truth' as CommercialContext)).toBe(true)
  })
})
