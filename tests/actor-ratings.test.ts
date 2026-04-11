import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { computeActorPerformance, computeAllActorPerformances } from '@/lib/performance/actor-ratings'

describe('computeActorPerformance', () => {
  it('returns 0–100 scores and a composite for seeded users', () => {
    const store = cloneSeedData()
    const processor = computeActorPerformance(store, 'user-processor-001')
    expect(processor.userId).toBe('user-processor-001')
    expect(processor.accuracyScore).toBe(100)
    for (const k of ['timelinessScore', 'accuracyScore', 'qualityAdherenceScore', 'compositeScore'] as const) {
      expect(processor[k]).toBeGreaterThanOrEqual(0)
      expect(processor[k]).toBeLessThanOrEqual(100)
    }
  })

  it('rewards transporter quality when DISPATCH and RECEIPT exist', () => {
    const store = cloneSeedData()
    const t = computeActorPerformance(store, 'user-transporter-001')
    expect(store.events.some((e) => e.type === 'DISPATCH' && e.actorId === 'user-transporter-001')).toBe(true)
    expect(store.events.some((e) => e.type === 'RECEIPT' && e.actorId === 'user-transporter-001')).toBe(true)
    expect(t.qualityAdherenceScore).toBeGreaterThanOrEqual(88)
  })

  it('computeAllActorPerformances returns one row per active user sorted by composite desc', () => {
    const store = cloneSeedData()
    const rows = computeAllActorPerformances(store)
    const activeIds = new Set(store.users.filter((u) => u.isActive).map((u) => u.id))
    expect(rows.length).toBe(activeIds.size)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].compositeScore).toBeGreaterThanOrEqual(rows[i].compositeScore)
    }
  })
})
