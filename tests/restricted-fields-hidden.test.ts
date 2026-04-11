import { describe, expect, it } from 'vitest'

import type { Bid, Trade } from '@/lib/domain/types'
import { redactBidForRole, redactTradeForRole } from '@/lib/trade-discovery/commercial-visibility'

describe('restricted fields are hidden for non-privileged viewers', () => {
  it('removes bid price outside trade discovery commercial roles', () => {
    const bid: Bid = {
      id: 'b1',
      rfqId: 'r1',
      bidderUserId: 'agg',
      price: 99,
      lotIds: [],
      status: 'SUBMITTED',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    const out = redactBidForRole(bid, 'farmer', 'trade_discovery')
    expect(out.price).toBeUndefined()
    expect(out.priceHidden).toBe(true)
  })

  it('removes trade financing and counterparty ids for regulator', () => {
    const trade: Trade = {
      id: 't1',
      rfqId: 'r1',
      buyerUserId: 'b',
      sellerUserId: 's',
      lotIds: ['l1'],
      status: 'OPEN',
      bankApproved: false,
      marginPercent: 5,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    const out = redactTradeForRole(trade, 'regulator', 'trade_discovery')
    expect(out.marginPercent).toBeUndefined()
    expect(out.buyerUserId).toBeUndefined()
    expect(out.sellerUserId).toBeUndefined()
  })
})
