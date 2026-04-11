import type { Event, LiveDataStore, Lot, LotForm, Role } from '@/lib/domain/types'
import { LOT_FORM_VALUES } from '@/lib/domain/constants'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, generateEntityId } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { assertLotOperational } from '@/lib/integrity/guards'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'

import { generateUniquePublicLotCode } from './farmer-pick-lot'
import { assertLotValidatedForAggregationSource } from './lot-validation-gates'
import { generateInternalUuid, generateOpaqueTraceKey } from './opaque-codes'

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

const asStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }
  return value.map((entry, index) => asTrimmedString(entry, `${label}[${index}]`))
}

const asOneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const next = asTrimmedString(value, label)
  if (!values.includes(next as T)) {
    throw new Error(`${label} must be one of ${values.join(', ')}`)
  }
  return next as T
}

const hasOwn = (input: UnknownRecord, key: string): boolean => Object.hasOwn(input, key)

const TRANSFORM_ACTOR_ROLES: readonly Role[] = ['aggregator', 'processor', 'admin']

const isTransformActorRole = (role: Role): boolean => TRANSFORM_ACTOR_ROLES.includes(role)

/**
 * Farmer-picked origin lots still on the farm account — aggregators may combine these for sourcing
 * without a separate custody-transfer step (MVP convenience).
 */
const lotIsFarmerOriginForAggregatorSourcing = (lot: Lot): boolean =>
  Boolean(lot.farmerId) && lot.ownerRole === 'farmer' && lot.custodianRole === 'farmer'

const assertAggregatorControlsSources = (actor: { id: string; role: Role }, sources: Lot[]): void => {
  if (actor.role !== 'aggregator') {
    return
  }
  for (const lot of sources) {
    const inCustody = lot.custodianId === actor.id || lot.ownerId === actor.id
    if (inCustody || lotIsFarmerOriginForAggregatorSourcing(lot)) {
      continue
    }
    throw new MasterDataError(
      `Aggregation: aggregator may only combine lots they own or custody, or farmer-origin lots still held at the farm (${lot.publicLotCode})`,
      403,
      'forbidden_lot_custody',
    )
  }
}

/** Lots that can still be combined or split in MVP workflows. */
const ELIGIBLE_LOT_STATUSES: readonly Lot['status'][] = [
  'ACTIVE',
  'IN_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

export type AggregateLotsRequest = {
  sourceLotIds: string[]
  outputWeight: number
  outputForm: LotForm
  actorId: string
}

export const parseAggregateLotsRequest = (value: unknown): AggregateLotsRequest => {
  const input = asRecord(value, 'aggregate')
  const sourceLotIds = asStringArray(input.sourceLotIds, 'aggregate.sourceLotIds')
  const outputWeight = asRequiredNumber(input.outputWeight, 'aggregate.outputWeight')
  const outputForm = asOneOf(input.outputForm, 'aggregate.outputForm', LOT_FORM_VALUES)
  const actorId = asTrimmedString(input.actorId, 'aggregate.actorId')
  return { sourceLotIds, outputWeight, outputForm, actorId }
}

export type DisaggregateOutputSpec = {
  weight: number
  form: LotForm
}

export type DisaggregateLotRequest = {
  sourceLotId: string
  outputs: DisaggregateOutputSpec[]
  actorId: string
}

const parseDisaggregateOutputs = (value: unknown): DisaggregateOutputSpec[] => {
  if (!Array.isArray(value)) {
    throw new Error('disaggregate.outputs must be an array')
  }
  if (value.length < 2) {
    throw new Error('disaggregate.outputs must contain at least two entries')
  }
  return value.map((entry, index) => {
    const row = asRecord(entry, `disaggregate.outputs[${index}]`)
    const weight = asRequiredNumber(row.weight, `disaggregate.outputs[${index}].weight`)
    const form = asOneOf(row.form, `disaggregate.outputs[${index}].form`, LOT_FORM_VALUES)
    return { weight, form }
  })
}

export const parseDisaggregateLotRequest = (value: unknown): DisaggregateLotRequest => {
  const input = asRecord(value, 'disaggregate')
  const sourceLotId = asTrimmedString(input.sourceLotId, 'disaggregate.sourceLotId')
  const outputs = parseDisaggregateOutputs(hasOwn(input, 'outputs') ? input.outputs : [])
  const actorId = asTrimmedString(input.actorId, 'disaggregate.actorId')
  return { sourceLotId, outputs, actorId }
}

const assertEligibleLot = (lot: Lot, context: string): void => {
  assertLotOperational(lot, context)
  if (!ELIGIBLE_LOT_STATUSES.includes(lot.status)) {
    throw new MasterDataError(`${context}: lot ${lot.publicLotCode} is not eligible`, 400, 'invalid_lot_status')
  }
}

const patchLotById = (store: LiveDataStore, lotId: string, patch: (lot: Lot) => Lot): void => {
  const index = store.lots.findIndex((entry) => entry.id === lotId)
  if (index < 0) {
    return
  }
  store.lots[index] = patch(store.lots[index])
}

export type LotTransformationResult = {
  lot: Lot
  event: Event
}

export type DisaggregateLotResult = {
  sourceLot: Lot
  childLots: Lot[]
  event: Event
}

/**
 * Many → one: creates a new lot, links parents/children on snapshots, appends AGGREGATE.
 */
export const aggregateLots = async (
  payload: unknown,
  projectRoot: string,
): Promise<LotTransformationResult> => {
  try {
    const input = parseAggregateLotsRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((user) => user.id === input.actorId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor user not found', 404, 'missing_entity')
    }
    if (!isTransformActorRole(actor.role)) {
      throw new MasterDataError('This role cannot record aggregation', 403, 'forbidden_role')
    }

    const uniqueSources = [...new Set(input.sourceLotIds)]
    if (uniqueSources.length < 2) {
      throw new MasterDataError('Select at least two distinct source lots', 400, 'invalid_sources')
    }

    const sources: Lot[] = []
    for (const id of uniqueSources) {
      const lot = store.lots.find((entry) => entry.id === id)
      if (!lot) {
        throw new MasterDataError(`Source lot not found: ${id}`, 404, 'missing_entity')
      }
      assertEligibleLot(lot, 'Aggregation')
      assertLotValidatedForAggregationSource(lot, 'Aggregation')
      sources.push(lot)
    }

    const combinedWeight = sources.reduce((sum, lot) => sum + lot.weight, 0)
    if (input.outputWeight <= 0 || input.outputWeight > combinedWeight) {
      throw new MasterDataError(
        'Output weight must be positive and cannot exceed the combined source weight',
        400,
        'invalid_quantity',
      )
    }

    assertAggregatorControlsSources(actor, sources)

    const timestamp = new Date().toISOString()
    const newLotId = generateEntityId('lots')
    const publicLotCode = generateUniquePublicLotCode(store)

    const newLot: Lot = {
      id: newLotId,
      publicLotCode,
      internalUuid: generateInternalUuid(),
      traceKey: generateOpaqueTraceKey(),
      form: input.outputForm,
      weight: input.outputWeight,
      ownerId: actor.id,
      ownerRole: actor.role,
      custodianId: actor.id,
      custodianRole: actor.role,
      parentLotIds: uniqueSources,
      childLotIds: [],
      status: 'READY_FOR_PROCESSING',
      labStatus: 'NOT_REQUIRED',
      isCollateral: false,
      integrityStatus: 'OK',
      validationStatus: 'VALIDATED',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const event: Event = {
      id: createEventId(),
      type: 'AGGREGATE',
      timestamp,
      actorId: actor.id,
      actorRole: actor.role,
      inputLotIds: uniqueSources,
      outputLotIds: [newLotId],
      inputQty: combinedWeight,
      outputQty: input.outputWeight,
      metadata: {
        sourcePublicLotCodes: sources.map((lot) => lot.publicLotCode),
      },
    }

    for (const source of sources) {
      patchLotById(store, source.id, (lot) => ({
        ...lot,
        childLotIds: lot.childLotIds.includes(newLotId) ? lot.childLotIds : [...lot.childLotIds, newLotId],
        updatedAt: timestamp,
      }))
    }

    store.lots.unshift(newLot)
    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    return { lot: newLot, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid aggregation payload',
      400,
      'invalid_payload',
    )
  }
}

/**
 * One → many: creates child lots, links lineage, appends DISAGGREGATE.
 */
export const disaggregateLot = async (
  payload: unknown,
  projectRoot: string,
): Promise<DisaggregateLotResult> => {
  try {
    const input = parseDisaggregateLotRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((user) => user.id === input.actorId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor user not found', 404, 'missing_entity')
    }
    if (!isTransformActorRole(actor.role)) {
      throw new MasterDataError('This role cannot record disaggregation', 403, 'forbidden_role')
    }

    const source = store.lots.find((entry) => entry.id === input.sourceLotId)
    if (!source) {
      throw new MasterDataError('Source lot not found', 404, 'missing_entity')
    }
    assertEligibleLot(source, 'Disaggregation')

    const sumOut = input.outputs.reduce((sum, row) => sum + row.weight, 0)
    if (sumOut <= 0 || sumOut > source.weight) {
      throw new MasterDataError(
        'Child weights must be positive and their sum cannot exceed the source lot weight',
        400,
        'invalid_quantity',
      )
    }

    const timestamp = new Date().toISOString()
    const childLots: Lot[] = []
    const childIds: string[] = []

    for (const spec of input.outputs) {
      const childId = generateEntityId('lots')
      childIds.push(childId)
      const code = generateUniquePublicLotCode(store)
      const child: Lot = {
        id: childId,
        publicLotCode: code,
        internalUuid: generateInternalUuid(),
        traceKey: generateOpaqueTraceKey(),
        fieldId: source.fieldId,
        farmerId: source.farmerId,
        farmId: source.farmId,
        form: spec.form,
        weight: spec.weight,
        ownerId: actor.id,
        ownerRole: actor.role,
        custodianId: actor.id,
        custodianRole: actor.role,
        parentLotIds: [source.id],
        childLotIds: [],
        status: 'IN_PROCESSING',
        labStatus: 'NOT_REQUIRED',
        isCollateral: false,
        integrityStatus: 'OK',
        validationStatus: 'VALIDATED',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      childLots.push(child)
      store.lots.unshift(child)
    }

    patchLotById(store, source.id, (lot) => ({
      ...lot,
      childLotIds: [...new Set([...lot.childLotIds, ...childIds])],
      updatedAt: timestamp,
    }))

    const event: Event = {
      id: createEventId(),
      type: 'DISAGGREGATE',
      timestamp,
      actorId: actor.id,
      actorRole: actor.role,
      inputLotIds: [source.id],
      outputLotIds: childIds,
      inputQty: source.weight,
      outputQty: sumOut,
      metadata: {
        childPublicLotCodes: childLots.map((lot) => lot.publicLotCode),
      },
    }

    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    const refreshedSource = store.lots.find((entry) => entry.id === source.id) ?? source

    return { sourceLot: refreshedSource, childLots, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid disaggregation payload',
      400,
      'invalid_payload',
    )
  }
}
