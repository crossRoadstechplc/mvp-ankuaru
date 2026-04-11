import type { RFQ, Role } from '@/lib/domain/types'
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

export type CreateRfqRequest = {
  createdByUserId: string
  quantity: number
  qualityRequirement: string
  location: string
  notes?: string
}

export const parseCreateRfqRequest = (value: unknown): CreateRfqRequest => {
  const input = asRecord(value, 'rfqCreate')
  return {
    createdByUserId: asTrimmedString(input.createdByUserId, 'rfqCreate.createdByUserId'),
    quantity: asRequiredNumber(input.quantity, 'rfqCreate.quantity'),
    qualityRequirement: asTrimmedString(input.qualityRequirement, 'rfqCreate.qualityRequirement'),
    location: asTrimmedString(input.location, 'rfqCreate.location'),
    notes: asOptionalString(input.notes, 'rfqCreate.notes'),
  }
}

/**
 * Publish an RFQ on the discovery board. Only active exporter or importer users may create RFQs.
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
    if (!isDiscoveryActorRole(user.role)) {
      throw new MasterDataError('Only exporter or importer users can create RFQs', 403, 'forbidden_role')
    }

    const actorRole = user.role as Role

    const rfq = await createEntity(
      'rfqs',
      {
        createdByUserId: req.createdByUserId,
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
