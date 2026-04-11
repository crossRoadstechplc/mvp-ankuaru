// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { canImporterViewLot, getAuthorizedLotIdsForImporter } from '@/lib/permissions/importer-access'

describe('importer-access', () => {
  it('returns lot ids from trades where buyer matches', () => {
    const store = cloneSeedData()
    const ids = getAuthorizedLotIdsForImporter(store, 'user-importer-001')
    expect(ids).toContain('lot-green-001')
  })

  it('rejects lots not on buyer trades', () => {
    const store = cloneSeedData()
    expect(canImporterViewLot(store, 'lot-cherry-001', 'user-importer-001')).toBe(false)
  })

  it('allows authorized lot', () => {
    const store = cloneSeedData()
    expect(canImporterViewLot(store, 'lot-green-001', 'user-importer-001')).toBe(true)
  })
})
