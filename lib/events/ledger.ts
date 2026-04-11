import { randomUUID } from 'node:crypto'

import type { Event, EventType, LiveDataStore, Role } from '@/lib/domain/types'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { MasterDataError, assertValidEntityId } from '@/lib/master-data/crud'

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`)
  }

  return value
}

const asString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }

  return value.trim()
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

const asStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }

  return value.map((entry, index) => asString(entry, `${label}[${index}]`))
}

const ROLE_VALUES = [
  'farmer',
  'aggregator',
  'processor',
  'transporter',
  'lab',
  'exporter',
  'importer',
  'bank',
  'admin',
  'regulator',
] as const satisfies ReadonlyArray<Role>

const EVENT_TYPE_VALUES = [
  'PICK',
  'CREATE_FIELD',
  'AGGREGATE',
  'DISAGGREGATE',
  'PROCESS',
  'TRANSFER_CUSTODY',
  'TRANSFER_OWNERSHIP',
  'DISPATCH',
  'RECEIPT',
  'HANDOVER_TO_LAB',
  'LAB_RESULT',
  'RFQ_CREATED',
  'BID_SUBMITTED',
  'BID_SELECTED',
  'TRADE_CREATED',
  'BANK_APPROVED',
  'DELIVERY_CONFIRMED',
  'SETTLEMENT_COMPLETED',
  'MARGIN_CALL',
  'TRADE_DEFAULTED',
  'COLLATERAL_LIQUIDATED',
  'INTEGRITY_FLAGGED',
  'VALIDATE_LOT',
] as const satisfies ReadonlyArray<EventType>

type EventCreateInput = Omit<Event, 'id' | 'timestamp'>

const asOneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const nextValue = asString(value, label)
  if (!values.includes(nextValue as T)) {
    throw new Error(`${label} must be one of ${values.join(', ')}`)
  }

  return nextValue as T
}

const asOptionalByproducts = (
  value: unknown,
  label: string,
): Event['byproducts'] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const input = asRecord(value, label)
  return {
    pulp: asOptionalNumber(input.pulp, `${label}.pulp`),
    husk: asOptionalNumber(input.husk, `${label}.husk`),
    parchment: asOptionalNumber(input.parchment, `${label}.parchment`),
    defects: asOptionalNumber(input.defects, `${label}.defects`),
    moistureLoss: asOptionalNumber(input.moistureLoss, `${label}.moistureLoss`),
  }
}

const asOptionalMetadata = (value: unknown, label: string): Record<string, unknown> | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return asRecord(value, label)
}

export const parseEventCreateInput = (value: unknown): EventCreateInput => {
  const input = asRecord(value, 'event')

  return {
    type: asOneOf(input.type, 'event.type', EVENT_TYPE_VALUES),
    actorId: asString(input.actorId, 'event.actorId'),
    actorRole: asOneOf(input.actorRole, 'event.actorRole', ROLE_VALUES),
    inputLotIds: asStringArray(input.inputLotIds ?? [], 'event.inputLotIds'),
    outputLotIds: asStringArray(input.outputLotIds ?? [], 'event.outputLotIds'),
    inputQty: asOptionalNumber(input.inputQty, 'event.inputQty'),
    outputQty: asOptionalNumber(input.outputQty, 'event.outputQty'),
    byproducts: asOptionalByproducts(input.byproducts, 'event.byproducts'),
    metadata: asOptionalMetadata(input.metadata, 'event.metadata'),
  }
}

export const createEventId = (): string => `event-${randomUUID().slice(0, 8)}`

export const readEvents = async (projectRoot = process.cwd()): Promise<Event[]> => {
  const store = await readLiveDataStore(projectRoot)
  return structuredClone(store.events)
}

export const readEventById = async (id: string, projectRoot = process.cwd()): Promise<Event> => {
  const eventId = assertValidEntityId(id)
  const events = await readEvents(projectRoot)
  const event = events.find((entry) => entry.id === eventId)

  if (!event) {
    throw new MasterDataError('Event not found', 404, 'missing_entity')
  }

  return event
}

export const appendEvent = async (payload: unknown, projectRoot = process.cwd()): Promise<Event> => {
  try {
    const parsed = parseEventCreateInput(payload)
    const store = await readLiveDataStore(projectRoot)
    const event: Event = {
      ...parsed,
      id: createEventId(),
      timestamp: new Date().toISOString(),
    }

    // Events form an append-only ledger. New operations only ever add to the tail.
    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)

    const { runIntegrityEngine } = await import('@/lib/integrity/run-engine')
    await runIntegrityEngine(projectRoot, { apply: true })

    return event
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }

    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid event payload',
      400,
      'invalid_payload',
    )
  }
}

export const rejectEventMutation = (): Response =>
  Response.json(
    {
      error: 'Events are append-only and do not support update or delete operations',
      code: 'method_not_allowed',
    },
    { status: 405 },
  )

export const readStoreWithEvents = async (projectRoot = process.cwd()): Promise<LiveDataStore> =>
  readLiveDataStore(projectRoot)
