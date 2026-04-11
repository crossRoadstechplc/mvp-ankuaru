/**
 * Processing engine — mass-balanced PROCESS events and inventory.
 *
 * **Primary output + byproduct lots (chosen model):**
 * - The main product becomes a new `Lot` with the selected output `form` and `outputWeight`.
 * - Each non-zero byproduct mass becomes a separate child `Lot` with `form: 'BYPRODUCT'` and
 *   `byproductKind` set to one of pulp | husk | parchment | defects | moistureLoss.
 * - This keeps traceability in the existing lot graph (`parentLotIds` / `childLotIds`, lineage APIs)
 *   while `Event.byproducts` on the PROCESS row mirrors the same masses for ledger analytics.
 *
 * Alternative (not used here): a parallel `byproductInventory` collection would duplicate graph edges;
 * child lots stay aligned with the append-only event ledger.
 */

import type { ByproductKind, Event, LiveDataStore, Lot, LotForm, ProcessingMethod, Role } from '@/lib/domain/types'
import { BYPRODUCT_KIND_VALUES, LOT_FORM_VALUES, PROCESSING_METHOD_VALUES } from '@/lib/domain/constants'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, generateEntityId } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { assertLotOperational } from '@/lib/integrity/guards'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'

import { assertActorMayProcessSourceLot } from './processing-eligibility'
import { generateUniquePublicLotCode } from './farmer-pick-lot'
import { generateInternalUuid, generateOpaqueTraceKey } from './opaque-codes'
import {
  MASS_BALANCE_EPSILON_KG,
  isMassBalanced,
  sumByproductMasses,
  type ByproductMasses,
} from './processing-mass-balance'

export {
  MASS_BALANCE_EPSILON_KG,
  isMassBalanced,
  sumByproductMasses,
  sumLedgerByproductsKg,
  type ByproductMasses,
} from './processing-mass-balance'

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

const asNonNegativeNumber = (value: unknown, label: string): number => {
  const n = asRequiredNumber(value, label)
  if (n < 0) {
    throw new Error(`${label} must be non-negative`)
  }
  return n
}

const asOneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const next = asTrimmedString(value, label)
  if (!values.includes(next as T)) {
    throw new Error(`${label} must be one of ${values.join(', ')}`)
  }
  return next as T
}

const hasOwn = (input: UnknownRecord, key: string): boolean => Object.hasOwn(input, key)

const PROCESSOR_ROLES: readonly Role[] = ['processor', 'admin']

const isProcessorActorRole = (role: Role): boolean => PROCESSOR_ROLES.includes(role)

export type ProcessLotRequest = {
  inputLotId: string
  inputWeight: number
  outputWeight: number
  outputForm: LotForm
  byproducts: ByproductMasses
  processingMethod: ProcessingMethod
  actorId: string
}

export const parseProcessLotRequest = (value: unknown): ProcessLotRequest => {
  const input = asRecord(value, 'process')
  const inputLotId = asTrimmedString(input.inputLotId, 'process.inputLotId')
  const inputWeight = asNonNegativeNumber(input.inputWeight, 'process.inputWeight')
  const outputWeight = asNonNegativeNumber(input.outputWeight, 'process.outputWeight')
  const outputForm = asOneOf(input.outputForm, 'process.outputForm', LOT_FORM_VALUES)
  const processingMethod = asOneOf(input.processingMethod, 'process.processingMethod', PROCESSING_METHOD_VALUES)
  const actorId = asTrimmedString(input.actorId, 'process.actorId')

  const bpRaw =
    hasOwn(input, 'byproducts') && input.byproducts !== null && input.byproducts !== undefined
      ? asRecord(input.byproducts, 'process.byproducts')
      : {}
  const byproducts: ByproductMasses = {
    pulp: asNonNegativeNumber(bpRaw.pulp ?? 0, 'process.byproducts.pulp'),
    husk: asNonNegativeNumber(bpRaw.husk ?? 0, 'process.byproducts.husk'),
    parchment: asNonNegativeNumber(bpRaw.parchment ?? 0, 'process.byproducts.parchment'),
    defects: asNonNegativeNumber(bpRaw.defects ?? 0, 'process.byproducts.defects'),
    moistureLoss: asNonNegativeNumber(bpRaw.moistureLoss ?? 0, 'process.byproducts.moistureLoss'),
  }

  if (outputForm === 'BYPRODUCT') {
    throw new Error('process.outputForm cannot be BYPRODUCT; choose the main product form')
  }

  return {
    inputLotId,
    inputWeight,
    outputWeight,
    outputForm,
    byproducts,
    processingMethod,
    actorId,
  }
}

const KIND_ORDER: readonly ByproductKind[] = BYPRODUCT_KIND_VALUES

const kindToKey: Record<ByproductKind, keyof ByproductMasses> = {
  pulp: 'pulp',
  husk: 'husk',
  parchment: 'parchment',
  defects: 'defects',
  moistureLoss: 'moistureLoss',
}

const kindToMass = (b: ByproductMasses, kind: ByproductKind): number => b[kindToKey[kind]]

const massToEventByproducts = (b: ByproductMasses): NonNullable<Event['byproducts']> => ({
  pulp: b.pulp || undefined,
  husk: b.husk || undefined,
  parchment: b.parchment || undefined,
  defects: b.defects || undefined,
  moistureLoss: b.moistureLoss || undefined,
})

export type ProcessLotResult = {
  sourceLot: Lot
  primaryLot: Lot | null
  byproductLots: Lot[]
  event: Event
}

export const processLot = async (payload: unknown, projectRoot: string): Promise<ProcessLotResult> => {
  try {
    const req = parseProcessLotRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((user) => user.id === req.actorId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor user not found', 404, 'missing_entity')
    }
    if (!isProcessorActorRole(actor.role)) {
      throw new MasterDataError('Only processor or admin roles can record processing', 403, 'forbidden_role')
    }

    const source = store.lots.find((lot) => lot.id === req.inputLotId)
    if (!source) {
      throw new MasterDataError('Input lot not found', 404, 'missing_entity')
    }
    assertLotOperational(source, 'Processing')
    assertActorMayProcessSourceLot(actor, source)
    if (req.inputWeight <= 0) {
      throw new MasterDataError('Input weight must be greater than zero', 400, 'invalid_quantity')
    }
    if (req.inputWeight > source.weight) {
      throw new MasterDataError('Input weight cannot exceed the lot snapshot weight', 400, 'invalid_quantity')
    }

    if (!isMassBalanced(req.inputWeight, req.outputWeight, req.byproducts)) {
      throw new MasterDataError(
        'Mass balance failed: input weight must equal output weight plus pulp, husk, parchment, defects, and moisture loss.',
        400,
        'mass_balance_violation',
      )
    }

    const hasPrimaryOutput = req.outputWeight > MASS_BALANCE_EPSILON_KG
    const byproductEntries = KIND_ORDER.filter((kind) => kindToMass(req.byproducts, kind) > MASS_BALANCE_EPSILON_KG)

    if (!hasPrimaryOutput && byproductEntries.length === 0) {
      throw new MasterDataError('At least one of main output or byproduct mass must be positive', 400, 'invalid_quantity')
    }

    const timestamp = new Date().toISOString()
    const sourceId = source.id
    const outputLotIds: string[] = []
    let primaryLot: Lot | null = null
    const byproductLots: Lot[] = []
    const byproductLotIdsByKind: Partial<Record<ByproductKind, string>> = {}

    if (hasPrimaryOutput) {
      const primaryId = generateEntityId('lots')
      const publicLotCode = generateUniquePublicLotCode(store)
      primaryLot = {
        id: primaryId,
        publicLotCode,
        internalUuid: generateInternalUuid(),
        traceKey: generateOpaqueTraceKey(),
        fieldId: source.fieldId,
        farmerId: source.farmerId,
        farmId: source.farmId,
        form: req.outputForm,
        weight: req.outputWeight,
        ownerId: actor.id,
        ownerRole: actor.role,
        custodianId: actor.id,
        custodianRole: actor.role,
        parentLotIds: [sourceId],
        childLotIds: [],
        status: 'IN_PROCESSING',
        labStatus: 'NOT_REQUIRED',
        isCollateral: false,
        integrityStatus: 'OK',
        validationStatus: 'VALIDATED',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      store.lots.unshift(primaryLot)
      outputLotIds.push(primaryId)
    }

    for (const kind of byproductEntries) {
      const w = kindToMass(req.byproducts, kind)
      const bid = generateEntityId('lots')
      const code = generateUniquePublicLotCode(store)
      const row: Lot = {
        id: bid,
        publicLotCode: code,
        internalUuid: generateInternalUuid(),
        traceKey: generateOpaqueTraceKey(),
        fieldId: source.fieldId,
        farmerId: source.farmerId,
        farmId: source.farmId,
        form: 'BYPRODUCT',
        byproductKind: kind,
        weight: w,
        ownerId: actor.id,
        ownerRole: actor.role,
        custodianId: actor.id,
        custodianRole: actor.role,
        parentLotIds: [sourceId],
        childLotIds: [],
        status: 'IN_PROCESSING',
        labStatus: 'NOT_REQUIRED',
        isCollateral: false,
        integrityStatus: 'OK',
        validationStatus: 'VALIDATED',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      byproductLots.push(row)
      store.lots.unshift(row)
      outputLotIds.push(bid)
      byproductLotIdsByKind[kind] = bid
    }

    const remaining = source.weight - req.inputWeight
    const sourceIndex = store.lots.findIndex((lot) => lot.id === sourceId)
    if (sourceIndex < 0) {
      throw new MasterDataError('Input lot not found after mutation', 500, 'invariant_broken')
    }

    const snapshot = store.lots[sourceIndex]
    const allChildIds = [...snapshot.childLotIds]
    for (const id of outputLotIds) {
      if (!allChildIds.includes(id)) {
        allChildIds.push(id)
      }
    }

    const updatedSource: Lot = {
      ...snapshot,
      weight: remaining,
      childLotIds: allChildIds,
      status: remaining <= MASS_BALANCE_EPSILON_KG ? 'CLOSED' : snapshot.status,
      updatedAt: timestamp,
    }
    store.lots[sourceIndex] = updatedSource

    const event: Event = {
      id: createEventId(),
      type: 'PROCESS',
      timestamp,
      actorId: actor.id,
      actorRole: actor.role,
      inputLotIds: [source.id],
      outputLotIds,
      inputQty: req.inputWeight,
      outputQty: req.outputWeight,
      byproducts: massToEventByproducts(req.byproducts),
      metadata: {
        processingMethod: req.processingMethod,
        primaryOutputLotId: primaryLot?.id,
        byproductLotIdsByKind,
        massBalanceCheck: 'passed',
      },
    }

    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    const refreshedSource = store.lots.find((lot) => lot.id === source.id) ?? updatedSource

    return {
      sourceLot: refreshedSource,
      primaryLot,
      byproductLots,
      event,
    }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid processing payload',
      400,
      'invalid_payload',
    )
  }
}
