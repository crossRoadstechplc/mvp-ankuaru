import type { Lot, Trade } from '@/lib/domain/types'
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

export type ReviewTradeFinancingRequest = {
  tradeId: string
  bankUserId: string
  decision: 'approve' | 'reject'
  /** Required when decision is approve */
  marginPercent?: number
  financingNotes?: string
  /** Simulator notional financed amount (bank pays seller narrative). */
  financedAmount?: number
}

export const parseReviewTradeFinancingRequest = (value: unknown): ReviewTradeFinancingRequest => {
  const input = asRecord(value, 'bankReview')
  const decisionRaw = asTrimmedString(input.decision, 'bankReview.decision')
  if (decisionRaw !== 'approve' && decisionRaw !== 'reject') {
    throw new Error('bankReview.decision must be approve or reject')
  }
  return {
    tradeId: asTrimmedString(input.tradeId, 'bankReview.tradeId'),
    bankUserId: asTrimmedString(input.bankUserId, 'bankReview.bankUserId'),
    decision: decisionRaw,
    marginPercent: asOptionalNumber(input.marginPercent, 'bankReview.marginPercent'),
    financingNotes: asOptionalString(input.financingNotes, 'bankReview.financingNotes'),
    financedAmount: asOptionalNumber(input.financedAmount, 'bankReview.financedAmount'),
  }
}

const pendingStatuses: Trade['status'][] = ['DRAFT', 'OPEN', 'BID_SELECTED', 'BANK_PENDING']

export type ReviewTradeFinancingOutcome = {
  trade: Trade
  lots: Lot[]
}

/**
 * Bank approves or rejects financing on a trade; on approval, locks margin (simulator), links collateral lots to the bank.
 */
export const reviewTradeFinancing = async (
  payload: unknown,
  projectRoot: string,
): Promise<ReviewTradeFinancingOutcome> => {
  try {
    const req = parseReviewTradeFinancingRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const bankUser = store.users.find((u) => u.id === req.bankUserId)
    if (!bankUser?.isActive) {
      throw new MasterDataError('Bank user not found', 404, 'missing_entity')
    }
    if (bankUser.role !== 'bank' && bankUser.role !== 'admin') {
      throw new MasterDataError('Only bank or admin users can review trade financing', 403, 'forbidden_role')
    }

    const tradeIndex = store.trades.findIndex((t) => t.id === req.tradeId)
    if (tradeIndex < 0) {
      throw new MasterDataError('Trade not found', 404, 'missing_entity')
    }

    const trade = store.trades[tradeIndex]
    if (trade.bankApproved) {
      throw new MasterDataError('Trade financing was already decided', 409, 'already_decided')
    }

    if (!pendingStatuses.includes(trade.status)) {
      throw new MasterDataError('Trade is not awaiting bank financing review', 400, 'invalid_trade_status')
    }

    const timestamp = new Date().toISOString()
    const updatedLots: Lot[] = []

    if (req.decision === 'approve') {
      const margin = req.marginPercent
      if (margin === undefined || !Number.isFinite(margin) || margin <= 0 || margin > 100) {
        throw new MasterDataError('marginPercent must be between 0 and 100 for approval', 400, 'invalid_margin')
      }

      const nextTrade: Trade = {
        ...trade,
        bankApproved: true,
        marginPercent: margin,
        marginLocked: true,
        status: 'BANK_APPROVED',
        financingNotes: req.financingNotes?.trim() || undefined,
        financedAmount: req.financedAmount,
        simulationSellerPaidByBank: true,
        simulationBuyerMarginOnlyUpfront: true,
        updatedAt: timestamp,
      }
      store.trades[tradeIndex] = nextTrade

      for (const lotId of trade.lotIds) {
        const li = store.lots.findIndex((l) => l.id === lotId)
        if (li < 0) {
          throw new MasterDataError(`Lot ${lotId} not found`, 404, 'missing_lot')
        }
        const lot = store.lots[li]
        const nextLot: Lot = {
          ...lot,
          isCollateral: true,
          collateralHolderId: req.bankUserId,
          updatedAt: timestamp,
        }
        store.lots[li] = nextLot
        updatedLots.push(nextLot)
      }

      const lotIdsForEvent = trade.lotIds.length > 0 ? trade.lotIds : []
      store.events.push({
        id: createEventId(),
        type: 'BANK_APPROVED',
        timestamp,
        actorId: req.bankUserId,
        actorRole: bankUser.role,
        inputLotIds: lotIdsForEvent,
        outputLotIds: lotIdsForEvent,
        metadata: {
          tradeId: trade.id,
          marginPercent: margin,
          marginLocked: true,
          simulationSellerPaidByBank: true,
          simulationBuyerMarginOnlyUpfront: true,
        },
      })
    } else {
      const notes =
        req.financingNotes?.trim() ||
        'Financing declined (simulator — no funds reserved; trade remains unfinanced).'
      const nextTrade: Trade = {
        ...trade,
        bankApproved: false,
        marginLocked: false,
        marginPercent: undefined,
        financingNotes: notes,
        status: trade.status === 'BANK_PENDING' ? 'DRAFT' : trade.status,
        updatedAt: timestamp,
      }
      store.trades[tradeIndex] = nextTrade
    }

    await writeLiveDataStore(store, projectRoot)

    return { trade: store.trades[tradeIndex], lots: updatedLots }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid bank review payload',
      400,
      'invalid_payload',
    )
  }
}
