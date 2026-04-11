// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { buildRoleDashboardView } from '@/lib/roles/dashboard'

describe('buildRoleDashboardView lab + exporter', () => {
  it('lists lab queue items with assess links', () => {
    const store = cloneSeedData()
    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    if (lot) {
      lot.labStatus = 'PENDING'
      lot.integrityStatus = 'OK'
    }

    const view = buildRoleDashboardView(store, 'lab', null)
    const queue = view.modules.find((m) => m.id === 'lab-queue')
    expect(queue?.items.some((i) => i.href?.includes('/lab/lots/lot-green-001/assess'))).toBe(true)
  })

  it('shows export eligibility copy on exporter ready lots', () => {
    const store = cloneSeedData()
    const view = buildRoleDashboardView(store, 'exporter', null)
    const ready = view.modules.find((m) => m.id === 'ready-for-export')
    const green = ready?.items.find((i) => i.id === 'lot-green-001')
    expect(green?.detail).toContain('Export eligible')
  })
})
