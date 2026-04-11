import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { validateDemoStore } from '@/lib/e2e/demo-validation'
import { evaluateStoreIntegrity } from '@/lib/integrity/evaluate'
import { getEventsForLot } from '@/lib/events/derived-state'

describe('cross-feature demo regression', () => {
  it('seeded export lot links RFQ → bid → dispatch → receipt → bank with integrity OK', () => {
    const store = cloneSeedData()
    expect(validateDemoStore(store).ok).toBe(true)

    const integrity = evaluateStoreIntegrity(store)
    const anyIssue = [...integrity.issuesByLotId.values()].some((issues) => issues.length > 0)
    expect(anyIssue).toBe(false)

    const trade = store.trades.find((t) => t.id === 'trade-001')
    expect(trade?.lotIds).toContain('lot-green-001')

    const timeline = getEventsForLot(store.events, 'lot-green-001').map((e) => e.type)
    const bidIdx = timeline.indexOf('BID_SUBMITTED')
    const selIdx = timeline.indexOf('BID_SELECTED')
    const dispIdx = timeline.indexOf('DISPATCH')
    const recIdx = timeline.indexOf('RECEIPT')
    const bankIdx = timeline.indexOf('BANK_APPROVED')
    expect(bidIdx).toBeGreaterThanOrEqual(0)
    expect(selIdx).toBeGreaterThan(bidIdx)
    expect(dispIdx).toBeGreaterThan(selIdx)
    expect(recIdx).toBeGreaterThan(dispIdx)
    expect(bankIdx).toBeGreaterThan(recIdx)
  })
})
