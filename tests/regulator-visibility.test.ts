import { describe, expect, it } from 'vitest'

import type { Trade } from '@/lib/domain/types'
import { redactTradeForRole } from '@/lib/trade-discovery/commercial-visibility'

const base: Trade = {
  id: 'trade-x',
  rfqId: 'rfq-x',
  buyerUserId: 'buyer-1',
  sellerUserId: 'seller-1',
  lotIds: ['lot-1'],
  status: 'BANK_APPROVED',
  bankApproved: true,
  marginPercent: 12,
  financedAmount: 5000,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('regulator visibility (redacted commercial + counterparties)', () => {
  it('hides prices, margins, financing, delivery commercial fields, and counterparty ids', () => {
    const enriched: Trade = {
      ...base,
      financingNotes: 'confidential',
      marginLocked: true,
      adjustmentAmount: -100,
      deliveredWeightKg: 900,
      deliveryNotes: 'dock A',
    }
    const t = redactTradeForRole(enriched, 'regulator', 'trade_discovery')
    expect(t.commercialHidden).toBe(true)
    expect(t.marginPercent).toBeUndefined()
    expect(t.financedAmount).toBeUndefined()
    expect(t.financingNotes).toBeUndefined()
    expect(t.deliveredWeightKg).toBeUndefined()
    expect(t.deliveryNotes).toBeUndefined()
    expect(t.buyerUserId).toBeUndefined()
    expect(t.sellerUserId).toBeUndefined()
    expect(t.counterpartiesRedacted).toBe(true)
    expect(t.status).toBe('BANK_APPROVED')
    expect(t.lotIds).toEqual(['lot-1'])
  })
})
