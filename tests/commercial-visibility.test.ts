import { describe, expect, it } from 'vitest'

import type { Bid, Trade } from '@/lib/domain/types'
import {
  canViewBidCommercials,
  canViewTradeCommercials,
  redactBidForRole,
  redactTradeForRole,
} from '@/lib/trade-discovery/commercial-visibility'

const sampleBid: Bid = {
  id: 'bid-x',
  rfqId: 'rfq-x',
  bidderUserId: 'agg',
  price: 6.25,
  lotIds: [],
  status: 'SUBMITTED',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const sampleTrade: Trade = {
  id: 'trade-x',
  rfqId: 'rfq-x',
  winningBidId: 'bid-x',
  buyerUserId: 'b',
  sellerUserId: 's',
  lotIds: ['lot-1'],
  status: 'DRAFT',
  bankApproved: false,
  marginPercent: 10,
  financedAmount: 1000,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('commercial visibility', () => {
  it('allows exporters, aggregators, importers, bank, admin to see bid prices', () => {
    expect(canViewBidCommercials('exporter')).toBe(true)
    expect(canViewBidCommercials('aggregator')).toBe(true)
    expect(canViewBidCommercials('importer')).toBe(true)
    expect(canViewBidCommercials('bank')).toBe(true)
    expect(canViewBidCommercials('admin')).toBe(true)
  })

  it('hides bid price for farmer and regulator roles', () => {
    const f = redactBidForRole(sampleBid, 'farmer')
    expect(f.priceHidden).toBe(true)
    expect(f.price).toBeUndefined()

    const r = redactBidForRole(sampleBid, 'regulator')
    expect(r.priceHidden).toBe(true)
  })

  it('preserves bid price for exporter role', () => {
    const e = redactBidForRole(sampleBid, 'exporter')
    expect(e.priceHidden).toBe(false)
    expect(e.price).toBe(6.25)
  })

  it('redacts trade financing fields for non-commercial roles', () => {
    const enriched: Trade = {
      ...sampleTrade,
      financingNotes: 'Secret terms',
      marginLocked: true,
      simulationSellerPaidByBank: true,
      simulationBuyerMarginOnlyUpfront: true,
      deliveredWeightKg: 900,
      deliveredQualityOk: true,
      deliveryNotes: 'Dock notes',
      deliveryConfirmedAt: '2026-01-02',
      simulatedPriceIndex: 0.95,
      bankRepaidSimulator: true,
      settlementCompletedAt: '2026-01-03',
      marginCallAt: '2026-01-04',
    }
    const t = redactTradeForRole(enriched, 'farmer')
    expect(t.commercialHidden).toBe(true)
    expect(t.financedAmount).toBeUndefined()
    expect(t.marginPercent).toBeUndefined()
    expect(t.financingNotes).toBeUndefined()
    expect(t.marginLocked).toBeUndefined()
    expect(t.simulationSellerPaidByBank).toBeUndefined()
    expect(t.simulationBuyerMarginOnlyUpfront).toBeUndefined()
    expect(t.deliveredWeightKg).toBeUndefined()
    expect(t.deliveredQualityOk).toBeUndefined()
    expect(t.deliveryNotes).toBeUndefined()
    expect(t.deliveryConfirmedAt).toBeUndefined()
    expect(t.simulatedPriceIndex).toBeUndefined()
    expect(t.bankRepaidSimulator).toBeUndefined()
    expect(t.settlementCompletedAt).toBeUndefined()
    expect(t.marginCallAt).toBeUndefined()
  })

  it('preserves trade fields for bank role', () => {
    expect(canViewTradeCommercials('bank')).toBe(true)
    const t = redactTradeForRole(sampleTrade, 'bank')
    expect(t.commercialHidden).toBe(false)
    expect(t.financedAmount).toBe(1000)
  })

  it('hides trade commercials for importer in physical_truth context (lot trace)', () => {
    expect(canViewTradeCommercials('importer', 'physical_truth')).toBe(false)
    const t = redactTradeForRole(sampleTrade, 'importer', 'physical_truth')
    expect(t.commercialHidden).toBe(true)
    expect(t.financedAmount).toBeUndefined()
    expect(t.buyerUserId).toBe('b')
  })

  it('still allows importer bid price in trade_discovery context', () => {
    expect(canViewBidCommercials('importer', 'trade_discovery')).toBe(true)
    const b = redactBidForRole(sampleBid, 'importer', 'trade_discovery')
    expect(b.priceHidden).toBe(false)
    expect(b.price).toBe(6.25)
  })

  it('strips counterparty ids for regulator role', () => {
    const t = redactTradeForRole(sampleTrade, 'regulator', 'trade_discovery')
    expect(t.counterpartiesRedacted).toBe(true)
    expect(t.buyerUserId).toBeUndefined()
    expect(t.sellerUserId).toBeUndefined()
    expect(t.financedAmount).toBeUndefined()
  })
})
