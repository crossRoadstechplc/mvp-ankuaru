import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, generateEntityId } from '@/lib/master-data/crud'

import { generateInternalUuid, generateOpaquePublicLotCode, generateOpaqueTraceKey } from './opaque-codes'

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

const asRequiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

const hasOwn = (input: UnknownRecord, key: string): boolean => Object.hasOwn(input, key)

/**
 * Optional harvest / pick metadata stored on the PICK event only (not duplicated on Lot snapshot).
 */
const asOptionalHarvestMetadata = (
  value: unknown,
  label: string,
): Record<string, unknown> | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return asRecord(value, label)
}

export type FarmerLotCreateRequest = {
  farmerId: string
  fieldId: string
  weight: number
  harvestMetadata?: Record<string, unknown>
}

export const parseFarmerLotCreateRequest = (value: unknown): FarmerLotCreateRequest => {
  const input = asRecord(value, 'farmerLot')
  const farmerId = asTrimmedString(input.farmerId, 'farmerLot.farmerId')
  const fieldId = asTrimmedString(input.fieldId, 'farmerLot.fieldId')
  const weight = asRequiredNumber(input.weight, 'farmerLot.weight')
  if (weight <= 0) {
    throw new Error('farmerLot.weight must be greater than zero')
  }

  let harvestMetadata: Record<string, unknown> | undefined
  if (hasOwn(input, 'harvestMetadata')) {
    harvestMetadata = asOptionalHarvestMetadata(input.harvestMetadata, 'farmerLot.harvestMetadata')
  }

  return { farmerId, fieldId, weight, harvestMetadata }
}

const isDuplicatePublicCode = (store: LiveDataStore, code: string): boolean =>
  store.lots.some((lot) => lot.publicLotCode === code)

export const generateUniquePublicLotCode = (store: LiveDataStore): string => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = generateOpaquePublicLotCode()
    if (!isDuplicatePublicCode(store, code)) {
      return code
    }
  }
  throw new MasterDataError('Could not allocate a unique public lot code', 500, 'code_generation_failed')
}

export type FarmerLotCreateResult = {
  lot: Lot
  event: Event
}

/**
 * Atomically creates a CHERRY lot tied to the farmer's field and appends a PICK event (append-only ledger).
 */
export const createFarmerLotWithPickEvent = async (
  payload: unknown,
  projectRoot: string,
): Promise<FarmerLotCreateResult> => {
  try {
    const input = parseFarmerLotCreateRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const field = store.fields.find((f) => f.id === input.fieldId)
    if (!field) {
      throw new MasterDataError('Field not found', 404, 'missing_entity')
    }
    if (field.farmerId !== input.farmerId) {
      throw new MasterDataError('Field is not registered for this farmer user id', 403, 'field_farmer_mismatch')
    }

    const farmerUser = store.users.find((u) => u.id === input.farmerId)
    if (!farmerUser || farmerUser.role !== 'farmer') {
      throw new MasterDataError('Farmer user id must reference an active farmer user', 400, 'invalid_farmer')
    }

    const profile = store.farmerProfiles.find((p) => p.userId === input.farmerId)

    const timestamp = new Date().toISOString()
    const lotId = generateEntityId('lots')
    const publicLotCode = generateUniquePublicLotCode(store)
    const internalUuid = generateInternalUuid()
    const traceKey = generateOpaqueTraceKey()

    const lot: Lot = {
      id: lotId,
      publicLotCode,
      internalUuid,
      traceKey,
      fieldId: field.id,
      farmerId: input.farmerId,
      farmId: profile?.id,
      form: 'CHERRY',
      weight: input.weight,
      ownerId: input.farmerId,
      ownerRole: 'farmer',
      custodianId: input.farmerId,
      custodianRole: 'farmer',
      parentLotIds: [],
      childLotIds: [],
      status: 'ACTIVE',
      labStatus: 'NOT_REQUIRED',
      isCollateral: false,
      integrityStatus: 'OK',
      validationStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const metadata: Record<string, unknown> = {
      fieldId: field.id,
      fieldName: field.name,
    }
    if (input.harvestMetadata && Object.keys(input.harvestMetadata).length > 0) {
      metadata.harvest = input.harvestMetadata
    }

    const event: Event = {
      id: createEventId(),
      type: 'PICK',
      timestamp,
      actorId: input.farmerId,
      actorRole: 'farmer',
      inputLotIds: [],
      outputLotIds: [lotId],
      outputQty: input.weight,
      metadata,
    }

    store.lots.unshift(lot)
    store.events.push(event)

    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    return { lot, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid farmer lot payload',
      400,
      'invalid_payload',
    )
  }
}
