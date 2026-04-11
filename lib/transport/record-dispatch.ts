import type { Event, Lot } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError } from '@/lib/master-data/crud'
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

const asOptionalBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== 'boolean') {
    throw new Error('insuredInTransit must be a boolean')
  }
  return value
}

export type RecordDispatchRequest = {
  lotId: string
  transporterUserId: string
  vehicleId: string
  driverId: string
  /** Free-text route / checkpoint / facility label */
  locationStatus?: string
  /** When true, lot is treated as insured-in-transit until receipt (see `isInsuredInTransitDisplay`). */
  insuredInTransit?: boolean
}

export const parseRecordDispatchRequest = (value: unknown): RecordDispatchRequest => {
  const input = asRecord(value, 'dispatch')
  return {
    lotId: asTrimmedString(input.lotId, 'dispatch.lotId'),
    transporterUserId: asTrimmedString(input.transporterUserId, 'dispatch.transporterUserId'),
    vehicleId: asTrimmedString(input.vehicleId, 'dispatch.vehicleId'),
    driverId: asTrimmedString(input.driverId, 'dispatch.driverId'),
    locationStatus: asOptionalString(input.locationStatus, 'dispatch.locationStatus'),
    insuredInTransit: asOptionalBoolean(input.insuredInTransit),
  }
}

const blockedDispatchStatuses: Lot['status'][] = ['CLOSED', 'QUARANTINED']

export type RecordDispatchOutcome = {
  event: Event
  lot: Lot
}

/**
 * Records DISPATCH, moves custody to the transporter, sets lot IN_TRANSIT. Legal ownership unchanged.
 */
export const recordDispatch = async (
  payload: unknown,
  projectRoot: string,
): Promise<RecordDispatchOutcome> => {
  try {
    const req = parseRecordDispatchRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.transporterUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Transporter user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'transporter') {
      throw new MasterDataError('Dispatch actor must be an active transporter user', 400, 'invalid_transporter')
    }

    const vehicle = store.vehicles.find((v) => v.id === req.vehicleId)
    if (!vehicle) {
      throw new MasterDataError('Vehicle not found', 404, 'missing_entity')
    }

    const driver = store.drivers.find((d) => d.id === req.driverId)
    if (!driver) {
      throw new MasterDataError('Driver not found', 404, 'missing_entity')
    }

    const lotIndex = store.lots.findIndex((l) => l.id === req.lotId)
    if (lotIndex < 0) {
      throw new MasterDataError('Lot not found', 404, 'missing_entity')
    }

    const lot = store.lots[lotIndex]
    assertLotOperational(lot, 'Dispatch')
    if (blockedDispatchStatuses.includes(lot.status)) {
      throw new MasterDataError('Lot cannot enter transit from its current status', 400, 'invalid_lot_status')
    }
    if (lot.status === 'IN_TRANSIT') {
      throw new MasterDataError('Lot is already in transit; record a receipt first', 409, 'already_in_transit')
    }

    const timestamp = new Date().toISOString()

    const metadata: Record<string, unknown> = {
      vehicleId: req.vehicleId,
      driverId: req.driverId,
      plateNumber: vehicle.plateNumber,
      driverName: driver.name,
      custodyTransfer: 'to_transporter',
      ownerUnchanged: true,
    }
    if (req.locationStatus) {
      metadata.locationStatus = req.locationStatus
    }
    if (req.insuredInTransit === true) {
      metadata.insuredInTransit = true
    }

    const event: Event = {
      id: createEventId(),
      type: 'DISPATCH',
      timestamp,
      actorId: req.transporterUserId,
      actorRole: 'transporter',
      inputLotIds: [req.lotId],
      outputLotIds: [req.lotId],
      metadata,
    }

    const updatedLot: Lot = {
      ...lot,
      custodianId: req.transporterUserId,
      custodianRole: actor.role,
      status: 'IN_TRANSIT',
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
      error instanceof Error ? error.message : 'Invalid dispatch payload',
      400,
      'invalid_payload',
    )
  }
}
