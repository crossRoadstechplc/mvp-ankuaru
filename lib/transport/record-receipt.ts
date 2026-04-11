import type { Event, Lot, Role } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError } from '@/lib/master-data/crud'
import { ROLE_VALUES } from '@/lib/domain/constants'
import { assertLotOperational } from '@/lib/integrity/guards'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'
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

const asOneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const next = asTrimmedString(value, label)
  if (!(values as readonly string[]).includes(next)) {
    throw new Error(`${label} must be one of ${values.join(', ')}`)
  }
  return next as T
}

export type RecordReceiptRequest = {
  lotId: string
  transporterUserId: string
  nextCustodianId: string
  nextCustodianRole: Role
  vehicleId?: string
  driverId?: string
  locationStatus?: string
}

export const parseRecordReceiptRequest = (value: unknown): RecordReceiptRequest => {
  const input = asRecord(value, 'receipt')
  return {
    lotId: asTrimmedString(input.lotId, 'receipt.lotId'),
    transporterUserId: asTrimmedString(input.transporterUserId, 'receipt.transporterUserId'),
    nextCustodianId: asTrimmedString(input.nextCustodianId, 'receipt.nextCustodianId'),
    nextCustodianRole: asOneOf(input.nextCustodianRole, 'receipt.nextCustodianRole', ROLE_VALUES),
    vehicleId: asOptionalString(input.vehicleId, 'receipt.vehicleId'),
    driverId: asOptionalString(input.driverId, 'receipt.driverId'),
    locationStatus: asOptionalString(input.locationStatus, 'receipt.locationStatus'),
  }
}

export type RecordReceiptOutcome = {
  event: Event
  lot: Lot
}

/**
 * Records RECEIPT, transfers custody from transporter to the receiving party. Ownership unchanged.
 */
export const recordReceipt = async (
  payload: unknown,
  projectRoot: string,
): Promise<RecordReceiptOutcome> => {
  try {
    const req = parseRecordReceiptRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.transporterUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Transporter user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'transporter') {
      throw new MasterDataError('Only transporter users can record receipt', 403, 'forbidden_role')
    }

    const nextCustodian = store.users.find((u) => u.id === req.nextCustodianId)
    if (!nextCustodian?.isActive) {
      throw new MasterDataError('Next custodian user not found', 404, 'missing_entity')
    }
    if (nextCustodian.role !== req.nextCustodianRole) {
      throw new MasterDataError('Next custodian role does not match user record', 400, 'custodian_role_mismatch')
    }

    if (req.vehicleId) {
      const vehicle = store.vehicles.find((v) => v.id === req.vehicleId)
      if (!vehicle) {
        throw new MasterDataError('Vehicle not found', 404, 'missing_entity')
      }
    }
    if (req.driverId) {
      const driver = store.drivers.find((d) => d.id === req.driverId)
      if (!driver) {
        throw new MasterDataError('Driver not found', 404, 'missing_entity')
      }
    }

    const lotIndex = store.lots.findIndex((l) => l.id === req.lotId)
    if (lotIndex < 0) {
      throw new MasterDataError('Lot not found', 404, 'missing_entity')
    }

    const lot = store.lots[lotIndex]
    assertLotOperational(lot, 'Receipt')
    if (lot.status !== 'IN_TRANSIT') {
      throw new MasterDataError('Lot is not in transit; dispatch must be recorded first', 400, 'not_in_transit')
    }

    const timestamp = new Date().toISOString()

    const metadata: Record<string, unknown> = {
      custodyTransfer: 'from_transporter',
      nextCustodianId: req.nextCustodianId,
      nextCustodianRole: req.nextCustodianRole,
      ownerUnchanged: true,
    }
    if (req.vehicleId) {
      metadata.vehicleId = req.vehicleId
      const v = store.vehicles.find((x) => x.id === req.vehicleId)
      if (v) metadata.plateNumber = v.plateNumber
    }
    if (req.driverId) {
      metadata.driverId = req.driverId
      const d = store.drivers.find((x) => x.id === req.driverId)
      if (d) metadata.driverName = d.name
    }
    if (req.locationStatus) {
      metadata.locationStatus = req.locationStatus
    }

    const event: Event = {
      id: createEventId(),
      type: 'RECEIPT',
      timestamp,
      actorId: req.transporterUserId,
      actorRole: actor.role,
      inputLotIds: [req.lotId],
      outputLotIds: [req.lotId],
      metadata,
    }

    const updatedLot: Lot = {
      ...lot,
      custodianId: req.nextCustodianId,
      custodianRole: req.nextCustodianRole,
      status: 'ACTIVE',
      updatedAt: timestamp,
    }

    store.lots[lotIndex] = updatedLot
    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    return { event, lot: updatedLot }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid receipt payload',
      400,
      'invalid_payload',
    )
  }
}
