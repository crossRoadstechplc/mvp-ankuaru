import type { Event, Lot, Trade } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

const asTrimmedString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value.trim()
}

const asOptionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return asTrimmedString(value, label)
}

const asOptionalNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

export type ConfirmDeliveryRequest = {
  tradeId: string
  actorUserId: string
  deliveredWeightKg: number
  deliveredQualityOk: boolean
  deliveryNotes?: string
  /** Signed adjustment: negative = rebate to buyer, positive = penalty / extra charge (simulator). */
  adjustmentAmount?: number
}

export const parseConfirmDeliveryRequest = (value: unknown): ConfirmDeliveryRequest => {
  const input = asRecord(value, 'delivery')
  const w = input.deliveredWeightKg
  if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) {
    throw new Error('delivery.deliveredWeightKg must be a positive number')
  }
  if (typeof input.deliveredQualityOk !== 'boolean') {
    throw new Error('delivery.deliveredQualityOk must be a boolean')
  }
  return {
    tradeId: asTrimmedString(input.tradeId, 'delivery.tradeId'),
    actorUserId: asTrimmedString(input.actorUserId, 'delivery.actorUserId'),
    deliveredWeightKg: w,
    deliveredQualityOk: input.deliveredQualityOk,
    deliveryNotes: asOptionalString(input.deliveryNotes, 'delivery.deliveryNotes'),
    adjustmentAmount: asOptionalNumber(input.adjustmentAmount, 'delivery.adjustmentAmount'),
  }
}

/** Trade must be in one of these statuses before a delivery confirmation (simulator). */
export const PRE_DELIVERY_TRADE_STATUSES: Trade['status'][] = ['BANK_APPROVED', 'IN_TRANSIT']

export type ConfirmDeliveryOutcome = {
  trade: Trade
  lots: Lot[]
  event: Event
}

/**
 * Buyer (importer) or seller (exporter), or admin, confirms delivery: updates trade and lots, appends DELIVERY_CONFIRMED.
 */
export const confirmDelivery = async (
  payload: unknown,
  projectRoot: string,
): Promise<ConfirmDeliveryOutcome> => {
  try {
    const req = parseConfirmDeliveryRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.actorUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'admin' && actor.role !== 'importer' && actor.role !== 'exporter') {
      throw new MasterDataError('Only buyer, seller, or admin can confirm delivery', 403, 'forbidden_role')
    }

    const tradeIndex = store.trades.findIndex((t) => t.id === req.tradeId)
    if (tradeIndex < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[tradeIndex]
    if (trade.status === 'DELIVERED' || trade.status === 'SETTLED') {
      throw new MasterDataError('Delivery already recorded for this trade', 409, 'already_delivered')
    }
    if (!PRE_DELIVERY_TRADE_STATUSES.includes(trade.status)) {
      throw new MasterDataError('Trade is not ready for delivery confirmation', 400, 'invalid_trade_status')
    }

    if (actor.role !== 'admin') {
      const isBuyer = trade.buyerUserId === req.actorUserId
      const isSeller = trade.sellerUserId === req.actorUserId
      if (!isBuyer && !isSeller) {
        throw new MasterDataError('Actor is not the buyer or seller on this trade', 403, 'forbidden_actor')
      }
    }

    const ts = new Date().toISOString()
    const adj = req.adjustmentAmount ?? 0

    const nextTrade: Trade = {
      ...trade,
      status: 'DELIVERED',
      deliveredWeightKg: req.deliveredWeightKg,
      deliveredQualityOk: req.deliveredQualityOk,
      deliveryNotes: req.deliveryNotes?.trim() || undefined,
      adjustmentAmount: adj,
      deliveryConfirmedAt: ts,
      updatedAt: ts,
    }
    store.trades[tradeIndex] = nextTrade

    const updatedLots: Lot[] = []
    for (const lotId of trade.lotIds) {
      const li = store.lots.findIndex((l) => l.id === lotId)
      if (li < 0) {
        throw new MasterDataError(`Lot ${lotId} not found`, 404, 'missing_lot')
      }
      const lot = store.lots[li]
      const nextLot: Lot = {
        ...lot,
        status: 'DELIVERED',
        updatedAt: ts,
      }
      store.lots[li] = nextLot
      updatedLots.push(nextLot)
    }

    const lotIds = trade.lotIds.length > 0 ? trade.lotIds : []
    const event: Event = {
      id: createEventId(),
      type: 'DELIVERY_CONFIRMED',
      timestamp: ts,
      actorId: req.actorUserId,
      actorRole: actor.role,
      inputLotIds: lotIds,
      outputLotIds: lotIds,
      outputQty: req.deliveredWeightKg,
      metadata: {
        tradeId: trade.id,
        deliveredWeightKg: req.deliveredWeightKg,
        deliveredQualityOk: req.deliveredQualityOk,
        adjustmentAmount: adj,
        deliveryNotes: req.deliveryNotes?.trim() || undefined,
      },
    }
    store.events.push(event)

    await writeLiveDataStore(store, projectRoot)

    return { trade: nextTrade, lots: updatedLots, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid delivery payload',
      400,
      'invalid_payload',
    )
  }
}
