import type { Bid, RFQ, Trade } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { assertTradeLotsExportEligible, generateEntityId, MasterDataError } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { assertUsersBankApproved } from '@/lib/trade-discovery/bank-gating'

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

export type SelectWinningBidRequest = {
  rfqId: string
  bidId: string
  /** Must match `RFQ.createdByUserId` (importer or exporter who published the RFQ). */
  rfqOwnerUserId: string
}

export const parseSelectWinningBidRequest = (value: unknown): SelectWinningBidRequest => {
  const input = asRecord(value, 'selectBid')
  return {
    rfqId: asTrimmedString(input.rfqId, 'selectBid.rfqId'),
    bidId: asTrimmedString(input.bidId, 'selectBid.bidId'),
    rfqOwnerUserId: asTrimmedString(input.rfqOwnerUserId, 'selectBid.rfqOwnerUserId'),
  }
}

export type SelectWinningBidOutcome = {
  rfq: RFQ
  winningBid: Bid
  trade: Trade
}

/**
 * RFQ owner selects a winning bid: closes RFQ, rejects other submitted bids, creates Trade linked to RFQ + bid.
 * Buyer = RFQ author; seller = winning bidder (`Bid.bidderUserId`).
 */
export const selectWinningBid = async (
  payload: unknown,
  projectRoot: string,
): Promise<SelectWinningBidOutcome> => {
  try {
    const req = parseSelectWinningBidRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.rfqOwnerUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('User not found', 404, 'missing_entity')
    }
    if (actor.role !== 'exporter' && actor.role !== 'importer') {
      throw new MasterDataError('Only exporter or importer users can select a winning bid', 403, 'forbidden_role')
    }

    const rfqIndex = store.rfqs.findIndex((r) => r.id === req.rfqId)
    if (rfqIndex < 0) {
      throw new MasterDataError('RFQ not found', 404, 'missing_entity')
    }

    const rfq = store.rfqs[rfqIndex]
    if (rfq.createdByUserId !== req.rfqOwnerUserId) {
      throw new MasterDataError('RFQ was not created by this user', 403, 'rfq_not_owned')
    }
    if (rfq.status !== 'OPEN') {
      throw new MasterDataError('RFQ is not open', 409, 'rfq_not_open')
    }

    const bidIndex = store.bids.findIndex((b) => b.id === req.bidId && b.rfqId === req.rfqId)
    if (bidIndex < 0) {
      throw new MasterDataError('Bid not found for this RFQ', 404, 'missing_entity')
    }

    const bid = store.bids[bidIndex]
    if (bid.status !== 'SUBMITTED') {
      throw new MasterDataError('Bid is not in a selectable state', 409, 'bid_not_submitted')
    }

    assertTradeLotsExportEligible(store, bid.lotIds)
    assertUsersBankApproved(
      store.users,
      store.bankReviews,
      [rfq.createdByUserId, bid.bidderUserId],
      'Winning bid selection',
    )

    const timestamp = new Date().toISOString()

    for (let i = 0; i < store.bids.length; i++) {
      const b = store.bids[i]
      if (b.rfqId !== req.rfqId || b.status !== 'SUBMITTED') {
        continue
      }
      if (b.id === req.bidId) {
        store.bids[i] = { ...b, status: 'SELECTED', updatedAt: timestamp }
      } else {
        store.bids[i] = { ...b, status: 'REJECTED', updatedAt: timestamp }
      }
    }

    const updatedRfq: RFQ = {
      ...rfq,
      status: 'CLOSED',
      updatedAt: timestamp,
    }
    store.rfqs[rfqIndex] = updatedRfq

    const tradeId = generateEntityId('trades')
    const trade: Trade = {
      id: tradeId,
      rfqId: req.rfqId,
      winningBidId: bid.id,
      buyerUserId: rfq.createdByUserId,
      sellerUserId: bid.bidderUserId,
      lotIds: bid.lotIds,
      status: 'BANK_PENDING',
      bankApproved: false,
      contractSummary: [
        'Contract summary (generated)',
        `RFQ: ${rfq.id}`,
        `Bid: ${bid.id}`,
        `Buyer: ${rfq.createdByUserId}`,
        `Seller: ${bid.bidderUserId}`,
        `Lots: ${bid.lotIds.join(', ') || 'n/a'}`,
        `Price: ${bid.price.toFixed(2)}`,
        `Quality: ${rfq.qualityRequirement}`,
        `Location: ${rfq.location}`,
        `Bank check: both parties approved`,
        `Generated at: ${timestamp}`,
      ].join(' | '),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    store.trades.unshift(trade)

    const lotIdsForEvent = bid.lotIds.length > 0 ? bid.lotIds : []
    store.events.push({
      id: createEventId(),
      type: 'BID_SELECTED',
      timestamp,
      actorId: req.rfqOwnerUserId,
      actorRole: actor.role,
      inputLotIds: lotIdsForEvent,
      outputLotIds: lotIdsForEvent,
      metadata: {
        bidId: bid.id,
        rfqId: req.rfqId,
        tradeId,
      },
    })
    store.events.push({
      id: createEventId(),
      type: 'TRADE_CREATED',
      timestamp,
      actorId: req.rfqOwnerUserId,
      actorRole: actor.role,
      inputLotIds: lotIdsForEvent,
      outputLotIds: lotIdsForEvent,
      metadata: {
        tradeId,
        rfqId: req.rfqId,
        winningBidId: bid.id,
      },
    })

    await writeLiveDataStore(store, projectRoot)

    const winningBid = store.bids.find((b) => b.id === req.bidId)!

    return { rfq: updatedRfq, winningBid, trade }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid selection payload',
      400,
      'invalid_payload',
    )
  }
}
