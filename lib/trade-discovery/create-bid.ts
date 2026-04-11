import type { Bid, Role } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, createEntity } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { isDiscoveryActorRole } from '@/lib/trade-discovery/discovery-permissions'

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

const asRequiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

const asStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((entry, index) => asTrimmedString(entry, `${label}[${index}]`))
}

export type CreateBidRequest = {
  rfqId: string
  bidderUserId: string
  price: number
  lotIds: string[]
  notes?: string
}

export const parseCreateBidRequest = (value: unknown): CreateBidRequest => {
  const input = asRecord(value, 'bidCreate')
  return {
    rfqId: asTrimmedString(input.rfqId, 'bidCreate.rfqId'),
    bidderUserId: asTrimmedString(input.bidderUserId, 'bidCreate.bidderUserId'),
    price: asRequiredNumber(input.price, 'bidCreate.price'),
    lotIds: asStringArray(input.lotIds, 'bidCreate.lotIds'),
    notes: asOptionalString(input.notes, 'bidCreate.notes'),
  }
}

/**
 * Submit a bid on an open RFQ. Only active exporter or importer users may bid (see discovery permissions).
 */
export const createDiscoveryBid = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ bid: Bid }> => {
  try {
    const req = parseCreateBidRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const user = store.users.find((u) => u.id === req.bidderUserId)
    if (!user?.isActive) {
      throw new MasterDataError('User not found', 404, 'missing_entity')
    }
    if (!isDiscoveryActorRole(user.role)) {
      throw new MasterDataError('Only exporter or importer users can submit bids', 403, 'forbidden_role')
    }

    const actorRole = user.role as Role

    const rfq = store.rfqs.find((r) => r.id === req.rfqId)
    if (!rfq) {
      throw new MasterDataError('RFQ not found', 404, 'missing_entity')
    }
    if (rfq.status !== 'OPEN') {
      throw new MasterDataError('RFQ is not open for bidding', 409, 'rfq_not_open')
    }

    const bid = await createEntity(
      'bids',
      {
        rfqId: req.rfqId,
        bidderUserId: req.bidderUserId,
        price: req.price,
        lotIds: req.lotIds,
        notes: req.notes,
        status: 'SUBMITTED',
      },
      projectRoot,
    )

    const storeAfter = await readLiveDataStore(projectRoot)
    const timestamp = new Date().toISOString()
    const lotIds = bid.lotIds
    storeAfter.events.push({
      id: createEventId(),
      type: 'BID_SUBMITTED',
      timestamp,
      actorId: req.bidderUserId,
      actorRole: actorRole,
      inputLotIds: lotIds,
      outputLotIds: lotIds,
      metadata: { bidId: bid.id, rfqId: req.rfqId },
    })
    await writeLiveDataStore(storeAfter, projectRoot)

    return { bid }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid bid payload',
      400,
      'invalid_payload',
    )
  }
}
