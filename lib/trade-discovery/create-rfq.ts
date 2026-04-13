import type { RFQ, Role } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, createEntity } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { canCreateDiscoveryRfq } from '@/lib/trade-discovery/discovery-permissions'
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

const asOptionalStringArray = (value: unknown, label: string): string[] | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((entry, index) => asTrimmedString(entry, `${label}[${index}]`))
}

export type CreateRfqRequest = {
  createdByUserId: string
  opportunityType?: 'RFQ' | 'IOI' | 'AUCTION'
  sourceLotIds?: string[]
  credibilityMode?: 'STANDARD' | 'LAB_VERIFIED' | 'LAB_TRANSPORT_VERIFIED'
  quantity: number
  qualityRequirement: string
  location: string
  notes?: string
}

export const parseCreateRfqRequest = (value: unknown): CreateRfqRequest => {
  const input = asRecord(value, 'rfqCreate')
  return {
    createdByUserId: asTrimmedString(input.createdByUserId, 'rfqCreate.createdByUserId'),
    opportunityType:
      input.opportunityType === undefined
        ? undefined
        : (asTrimmedString(input.opportunityType, 'rfqCreate.opportunityType') as 'RFQ' | 'IOI' | 'AUCTION'),
    sourceLotIds: asOptionalStringArray(input.sourceLotIds, 'rfqCreate.sourceLotIds'),
    credibilityMode:
      input.credibilityMode === undefined
        ? undefined
        : (asTrimmedString(input.credibilityMode, 'rfqCreate.credibilityMode') as
            | 'STANDARD'
            | 'LAB_VERIFIED'
            | 'LAB_TRANSPORT_VERIFIED'),
    quantity: asRequiredNumber(input.quantity, 'rfqCreate.quantity'),
    qualityRequirement: asTrimmedString(input.qualityRequirement, 'rfqCreate.qualityRequirement'),
    location: asTrimmedString(input.location, 'rfqCreate.location'),
    notes: asOptionalString(input.notes, 'rfqCreate.notes'),
  }
}

/**
 * Publish an RFQ on the discovery board. Active processor/exporter/importer users may create RFQs.
 */
export const createDiscoveryRfq = async (
  payload: unknown,
  projectRoot: string,
): Promise<{ rfq: RFQ }> => {
  try {
    const req = parseCreateRfqRequest(payload)
    const store = await readLiveDataStore(projectRoot)
    const user = store.users.find((u) => u.id === req.createdByUserId)
    if (!user?.isActive) {
      throw new MasterDataError('User not found', 404, 'missing_entity')
    }
    if (!canCreateDiscoveryRfq(user.role)) {
      throw new MasterDataError('Only processor, exporter, or importer users can create RFQs', 403, 'forbidden_role')
    }
    assertUsersBankApproved(store.users, store.bankReviews, [req.createdByUserId], 'RFQ creation')
    if (req.credibilityMode && !['STANDARD', 'LAB_VERIFIED', 'LAB_TRANSPORT_VERIFIED'].includes(req.credibilityMode)) {
      throw new MasterDataError('Invalid credibility mode', 400, 'invalid_payload')
    }
    if (req.opportunityType && !['RFQ', 'IOI', 'AUCTION'].includes(req.opportunityType)) {
      throw new MasterDataError('Invalid opportunity type', 400, 'invalid_payload')
    }
    if (user.role === 'processor' && (!req.sourceLotIds || req.sourceLotIds.length === 0)) {
      throw new MasterDataError('Processor RFQs must reference at least one processed source lot', 400, 'missing_source_lots')
    }
    if (req.sourceLotIds?.length) {
      for (const lotId of req.sourceLotIds) {
        const lot = store.lots.find((entry) => entry.id === lotId)
        if (!lot) {
          throw new MasterDataError(`Source lot ${lotId} not found`, 404, 'missing_entity')
        }
        if (lot.ownerId !== req.createdByUserId) {
          throw new MasterDataError(
            `Source lot ${lotId} is not owned by the opportunity creator`,
            403,
            'lot_not_owned',
          )
        }
        const hasProcess = store.events.some((event) => event.type === 'PROCESS' && event.outputLotIds.includes(lotId))
        if (!hasProcess) {
          throw new MasterDataError(`Source lot ${lotId} is not a processed output`, 400, 'invalid_source_lot')
        }
      }
    }

    const actorRole = user.role as Role

    const rfq = await createEntity(
      'rfqs',
      {
        createdByUserId: req.createdByUserId,
        opportunityType: req.opportunityType ?? 'RFQ',
        sourceLotIds: req.sourceLotIds,
        credibilityMode: req.credibilityMode ?? 'STANDARD',
        quantity: req.quantity,
        qualityRequirement: req.qualityRequirement,
        location: req.location,
        notes: req.notes,
        status: 'OPEN',
      },
      projectRoot,
    )

    const storeAfter = await readLiveDataStore(projectRoot)
    const timestamp = new Date().toISOString()
    storeAfter.events.push({
      id: createEventId(),
      type: 'RFQ_CREATED',
      timestamp,
      actorId: req.createdByUserId,
      actorRole: actorRole,
      inputLotIds: [],
      outputLotIds: [],
      metadata: { rfqId: rfq.id },
    })
    await writeLiveDataStore(storeAfter, projectRoot)

    return { rfq }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid RFQ payload',
      400,
      'invalid_payload',
    )
  }
}
