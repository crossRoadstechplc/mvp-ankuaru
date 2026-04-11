import type { Bid, Role, Trade } from '@/lib/domain/types'
import type { CommercialContext } from '@/lib/permissions/commercial-context'
import { roleSeesCommercialInContext } from '@/lib/permissions/commercial-context'

export type { CommercialContext } from '@/lib/permissions/commercial-context'
export { COMMERCIAL_SENSITIVE_ROLES } from '@/lib/permissions/commercial-context'

export const canViewBidCommercials = (role: Role, context: CommercialContext = 'trade_discovery'): boolean =>
  roleSeesCommercialInContext(role, context)

export const canViewTradeCommercials = (role: Role, context: CommercialContext = 'trade_discovery'): boolean =>
  roleSeesCommercialInContext(role, context)

export type BidPublic = Omit<Bid, 'price'> & { price?: number; priceHidden?: boolean }

export const redactBidForRole = (
  bid: Bid,
  role: Role,
  context: CommercialContext = 'trade_discovery',
): BidPublic => {
  if (canViewBidCommercials(role, context)) {
    return { ...bid, priceHidden: false }
  }
  const { price: _p, ...rest } = bid
  return { ...rest, priceHidden: true }
}

export type TradePublic = Omit<
  Trade,
  | 'buyerUserId'
  | 'sellerUserId'
  | 'financedAmount'
  | 'adjustmentAmount'
  | 'marginPercent'
  | 'deliveredWeightKg'
  | 'deliveredQualityOk'
  | 'deliveryNotes'
  | 'deliveryConfirmedAt'
  | 'simulatedPriceIndex'
  | 'bankRepaidSimulator'
  | 'bankRepaidAt'
  | 'settlementCompletedAt'
  | 'marginCallAt'
  | 'defaultedAt'
  | 'liquidatedAt'
> & {
  buyerUserId?: string
  sellerUserId?: string
  financedAmount?: number
  adjustmentAmount?: number
  marginPercent?: number
  deliveredWeightKg?: number
  deliveredQualityOk?: boolean
  deliveryNotes?: string
  deliveryConfirmedAt?: string
  simulatedPriceIndex?: number
  bankRepaidSimulator?: boolean
  bankRepaidAt?: string
  settlementCompletedAt?: string
  marginCallAt?: string
  defaultedAt?: string
  liquidatedAt?: string
  commercialHidden?: boolean
  /** Regulator / oversight: buyer & seller user ids withheld. */
  counterpartiesRedacted?: boolean
}

const stripTradeCommercialFields = (trade: Trade): TradePublic => ({
  ...trade,
  financedAmount: undefined,
  adjustmentAmount: undefined,
  marginPercent: undefined,
  financingNotes: undefined,
  marginLocked: undefined,
  simulationSellerPaidByBank: undefined,
  simulationBuyerMarginOnlyUpfront: undefined,
  deliveredWeightKg: undefined,
  deliveredQualityOk: undefined,
  deliveryNotes: undefined,
  deliveryConfirmedAt: undefined,
  simulatedPriceIndex: undefined,
  bankRepaidSimulator: undefined,
  bankRepaidAt: undefined,
  settlementCompletedAt: undefined,
  marginCallAt: undefined,
  defaultedAt: undefined,
  liquidatedAt: undefined,
  commercialHidden: true,
})

/** Hide buyer/seller identity for regulator-style oversight. */
export const redactTradeCounterparties = (trade: TradePublic): TradePublic => ({
  ...trade,
  buyerUserId: undefined,
  sellerUserId: undefined,
  counterpartiesRedacted: true,
})

export const redactTradeForRole = (
  trade: Trade,
  role: Role,
  context: CommercialContext = 'trade_discovery',
): TradePublic => {
  let next: TradePublic

  if (canViewTradeCommercials(role, context)) {
    next = { ...trade, commercialHidden: false }
  } else {
    next = stripTradeCommercialFields(trade)
  }

  if (role === 'regulator') {
    next = redactTradeCounterparties(next)
  }

  return next
}
