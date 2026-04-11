import type { Event, Lot, Trade } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { marginMaintenanceFloorFromPercent } from '@/lib/trade-lifecycle/margin-floor'

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

const asOptionalBoolean = (value: unknown, label: string): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }
  return value
}

const ts = () => new Date().toISOString()

/** Price index below which posted margin is treated as insufficient (vs 1.0 par), derived from locked margin %. */
export const marginMaintenanceFloor = (trade: Trade): number => marginMaintenanceFloorFromPercent(trade.marginPercent)

const marginEvaluableStatuses: Trade['status'][] = ['BANK_APPROVED', 'IN_TRANSIT', 'DELIVERED']

// --- Settlement (buyer repays + completes) ---

export type SimulateSettlementRequest = {
  tradeId: string
  actorUserId: string
  /** Simulator: buyer marks bank facility repaid. */
  repayBank?: boolean
  /** Complete trade settlement (status → SETTLED). */
  completeSettlement: boolean
}

export const parseSimulateSettlementRequest = (value: unknown): SimulateSettlementRequest => {
  const input = asRecord(value, 'settlement')
  const complete = input.completeSettlement
  if (typeof complete !== 'boolean') {
    throw new Error('settlement.completeSettlement must be a boolean')
  }
  return {
    tradeId: asTrimmedString(input.tradeId, 'settlement.tradeId'),
    actorUserId: asTrimmedString(input.actorUserId, 'settlement.actorUserId'),
    repayBank: asOptionalBoolean(input.repayBank, 'settlement.repayBank'),
    completeSettlement: complete,
  }
}

export const simulateSettlement = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ trade: Trade; event?: Event }> => {
  try {
    const req = parseSimulateSettlementRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.actorUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor not found', 404, 'missing_entity')
    }
    if (actor.role !== 'importer' && actor.role !== 'admin') {
      throw new MasterDataError('Only buyer (importer) or admin can settle', 403, 'forbidden_role')
    }

    const i = store.trades.findIndex((t) => t.id === req.tradeId)
    if (i < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[i]
    if (trade.status !== 'DELIVERED') {
      throw new MasterDataError('Settlement requires status DELIVERED (margin call blocks until resolved)', 400, 'invalid_trade_status')
    }
    if (actor.role === 'importer' && trade.buyerUserId !== req.actorUserId) {
      throw new MasterDataError('Actor is not the buyer on this trade', 403, 'forbidden_actor')
    }

    const now = ts()
    let next: Trade = { ...trade, updatedAt: now }

    if (req.repayBank) {
      next = {
        ...next,
        bankRepaidSimulator: true,
        bankRepaidAt: now,
      }
    }

    if (req.completeSettlement) {
      next = {
        ...next,
        status: 'SETTLED',
        settlementCompletedAt: now,
      }
    } else if (req.repayBank) {
      /* repay-only */
    } else {
      throw new MasterDataError('Provide repayBank and/or completeSettlement', 400, 'invalid_payload')
    }

    store.trades[i] = next

    let event: Event | undefined
    if (req.completeSettlement) {
      event = {
        id: createEventId(),
        type: 'SETTLEMENT_COMPLETED',
        timestamp: now,
        actorId: req.actorUserId,
        actorRole: actor.role,
        inputLotIds: trade.lotIds,
        outputLotIds: trade.lotIds,
        metadata: {
          tradeId: trade.id,
          bankRepaidSimulator: next.bankRepaidSimulator ?? false,
          repayBankRequested: Boolean(req.repayBank),
        },
      }
      store.events.push(event)
    }

    await writeLiveDataStore(store, projectRoot)
    return { trade: next, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid settlement payload',
      400,
      'invalid_payload',
    )
  }
}

// --- Margin monitoring ---

export type EvaluateMarginRequest = {
  tradeId: string
  actorUserId: string
  /** Simulated market price index (1.0 = contract par). */
  simulatedPriceIndex: number
}

export const parseEvaluateMarginRequest = (value: unknown): EvaluateMarginRequest => {
  const input = asRecord(value, 'margin')
  const idx = input.simulatedPriceIndex
  if (typeof idx !== 'number' || !Number.isFinite(idx) || idx <= 0 || idx > 5) {
    throw new Error('margin.simulatedPriceIndex must be a number between 0 and 5')
  }
  return {
    tradeId: asTrimmedString(input.tradeId, 'margin.tradeId'),
    actorUserId: asTrimmedString(input.actorUserId, 'margin.actorUserId'),
    simulatedPriceIndex: idx,
  }
}

export const evaluateMarginPressure = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ trade: Trade; event?: Event; marginCallTriggered: boolean }> => {
  try {
    const req = parseEvaluateMarginRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.actorUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor not found', 404, 'missing_entity')
    }
    if (!['bank', 'admin', 'importer', 'exporter'].includes(actor.role)) {
      throw new MasterDataError('Only bank, buyer, seller, or admin can run margin evaluation', 403, 'forbidden_role')
    }

    const i = store.trades.findIndex((t) => t.id === req.tradeId)
    if (i < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[i]
    if (!trade.bankApproved) {
      throw new MasterDataError('Trade is not bank-financed', 400, 'not_financed')
    }

    if (['SETTLED', 'LIQUIDATED', 'DEFAULTED'].includes(trade.status)) {
      throw new MasterDataError('Trade is in a terminal risk state for this simulator', 400, 'invalid_trade_status')
    }

    if (!marginEvaluableStatuses.includes(trade.status) && trade.status !== 'MARGIN_CALL') {
      throw new MasterDataError('Margin evaluation is not valid for this trade status', 400, 'invalid_trade_status')
    }

    if (actor.role === 'importer' && trade.buyerUserId !== req.actorUserId) {
      throw new MasterDataError('Actor is not the buyer', 403, 'forbidden_actor')
    }
    if (actor.role === 'exporter' && trade.sellerUserId !== req.actorUserId) {
      throw new MasterDataError('Actor is not the seller', 403, 'forbidden_actor')
    }

    const now = ts()
    const floor = marginMaintenanceFloor(trade)
    const triggered = req.simulatedPriceIndex < floor

    let next: Trade = {
      ...trade,
      simulatedPriceIndex: req.simulatedPriceIndex,
      updatedAt: now,
    }

    let event: Event | undefined
    let marginCallTriggered = false

    if (triggered && trade.status !== 'MARGIN_CALL') {
      next = {
        ...next,
        status: 'MARGIN_CALL',
        marginCallAt: now,
      }
      marginCallTriggered = true
      event = {
        id: createEventId(),
        type: 'MARGIN_CALL',
        timestamp: now,
        actorId: req.actorUserId,
        actorRole: actor.role,
        inputLotIds: trade.lotIds,
        outputLotIds: trade.lotIds,
        metadata: {
          tradeId: trade.id,
          simulatedPriceIndex: req.simulatedPriceIndex,
          maintenanceFloor: floor,
          reason: 'Simulated price drop — insufficient margin vs policy floor',
        },
      }
      store.events.push(event)
    }

    store.trades[i] = next
    await writeLiveDataStore(store, projectRoot)
    return { trade: next, event, marginCallTriggered }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid margin payload',
      400,
      'invalid_payload',
    )
  }
}

// --- Default (after margin call) ---

export type SimulateDefaultRequest = {
  tradeId: string
  bankUserId: string
}

export const parseSimulateDefaultRequest = (value: unknown): SimulateDefaultRequest => {
  const input = asRecord(value, 'default')
  return {
    tradeId: asTrimmedString(input.tradeId, 'default.tradeId'),
    bankUserId: asTrimmedString(input.bankUserId, 'default.bankUserId'),
  }
}

export const simulateTradeDefault = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ trade: Trade; event: Event }> => {
  try {
    const req = parseSimulateDefaultRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.bankUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Bank user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'bank' && actor.role !== 'admin') {
      throw new MasterDataError('Only bank or admin can declare default', 403, 'forbidden_role')
    }

    const i = store.trades.findIndex((t) => t.id === req.tradeId)
    if (i < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[i]
    if (trade.status !== 'MARGIN_CALL') {
      throw new MasterDataError('Default simulation requires status MARGIN_CALL', 400, 'invalid_trade_status')
    }

    const now = ts()
    const next: Trade = {
      ...trade,
      status: 'DEFAULTED',
      defaultedAt: now,
      updatedAt: now,
    }
    store.trades[i] = next

    const event: Event = {
      id: createEventId(),
      type: 'TRADE_DEFAULTED',
      timestamp: now,
      actorId: req.bankUserId,
      actorRole: actor.role,
      inputLotIds: trade.lotIds,
      outputLotIds: trade.lotIds,
      metadata: {
        tradeId: trade.id,
        reason: 'Settlement / margin obligations unmet (simulator)',
      },
    }
    store.events.push(event)

    await writeLiveDataStore(store, projectRoot)
    return { trade: next, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid default payload',
      400,
      'invalid_payload',
    )
  }
}

// --- Liquidation ---

export type LiquidateTradeRequest = {
  tradeId: string
  bankUserId: string
}

export const parseLiquidateTradeRequest = (value: unknown): LiquidateTradeRequest => {
  const input = asRecord(value, 'liquidate')
  return {
    tradeId: asTrimmedString(input.tradeId, 'liquidate.tradeId'),
    bankUserId: asTrimmedString(input.bankUserId, 'liquidate.bankUserId'),
  }
}

export const liquidateTradeCollateral = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ trade: Trade; lots: Lot[]; event: Event }> => {
  try {
    const req = parseLiquidateTradeRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.bankUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Bank user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'bank' && actor.role !== 'admin') {
      throw new MasterDataError('Only bank or admin can liquidate collateral', 403, 'forbidden_role')
    }

    const ti = store.trades.findIndex((t) => t.id === req.tradeId)
    if (ti < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[ti]
    if (trade.status !== 'MARGIN_CALL' && trade.status !== 'DEFAULTED') {
      throw new MasterDataError('Liquidation requires MARGIN_CALL or DEFAULTED status', 400, 'invalid_trade_status')
    }

    const now = ts()
    const nextTrade: Trade = {
      ...trade,
      status: 'LIQUIDATED',
      liquidatedAt: now,
      updatedAt: now,
    }
    store.trades[ti] = nextTrade

    const updatedLots: Lot[] = []
    for (const lotId of trade.lotIds) {
      const li = store.lots.findIndex((l) => l.id === lotId)
      if (li < 0) {
        throw new MasterDataError(`Lot ${lotId} not found`, 404, 'missing_lot')
      }
      const lot = store.lots[li]
      const nextLot: Lot = {
        ...lot,
        isCollateral: false,
        collateralHolderId: undefined,
        updatedAt: now,
      }
      store.lots[li] = nextLot
      updatedLots.push(nextLot)
    }

    const event: Event = {
      id: createEventId(),
      type: 'COLLATERAL_LIQUIDATED',
      timestamp: now,
      actorId: req.bankUserId,
      actorRole: actor.role,
      inputLotIds: trade.lotIds,
      outputLotIds: trade.lotIds,
      metadata: {
        tradeId: trade.id,
        message: 'Bank liquidated pledged lots (simulator — collateral flags cleared)',
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
      error instanceof Error ? error.message : 'Invalid liquidation payload',
      400,
      'invalid_payload',
    )
  }
}
