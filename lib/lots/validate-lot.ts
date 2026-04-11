import type { Event, Lot } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'
import { MasterDataError } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { lotIsFarmerOriginHeldAtFarm } from './lot-validation-gates'

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

const asOptionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }
  const t = value.trim()
  return t.length === 0 ? undefined : t
}

const hasOwn = (input: UnknownRecord, key: string): boolean => Object.hasOwn(input, key)

const VALIDATE_ACTOR_ROLES = ['aggregator', 'admin'] as const

export type ValidateLotDecision = 'VALIDATED' | 'REJECTED'

export type ValidateLotRequest = {
  lotId: string
  actorId: string
  decision: ValidateLotDecision
  observedWeight: number
  validationNotes?: string
}

export const parseValidateLotRequest = (value: unknown): ValidateLotRequest => {
  const input = asRecord(value, 'validateLot')
  return {
    lotId: asTrimmedString(input.lotId, 'validateLot.lotId'),
    actorId: asTrimmedString(input.actorId, 'validateLot.actorId'),
    decision: (() => {
      const d = asTrimmedString(input.decision, 'validateLot.decision')
      if (d !== 'VALIDATED' && d !== 'REJECTED') {
        throw new Error('validateLot.decision must be VALIDATED or REJECTED')
      }
      return d
    })(),
    observedWeight: asRequiredNumber(input.observedWeight, 'validateLot.observedWeight'),
    validationNotes: hasOwn(input, 'validationNotes')
      ? asOptionalString(input.validationNotes, 'validateLot.validationNotes')
      : undefined,
  }
}

export type ValidateLotResult = {
  lot: Lot
  event: Event
}

/**
 * Aggregator QC gate for farmer-held origin lots: approve (record observed weight on the lot) or reject.
 */
export const validateLot = async (payload: unknown, projectRoot: string): Promise<ValidateLotResult> => {
  try {
    const input = parseValidateLotRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((user) => user.id === input.actorId)
    if (!actor?.isActive) {
      throw new MasterDataError('Actor user not found', 404, 'missing_entity')
    }
    if (!VALIDATE_ACTOR_ROLES.includes(actor.role as (typeof VALIDATE_ACTOR_ROLES)[number])) {
      throw new MasterDataError('Only aggregators or admins may validate farmer origin lots', 403, 'forbidden_role')
    }

    const lotIndex = store.lots.findIndex((entry) => entry.id === input.lotId)
    if (lotIndex < 0) {
      throw new MasterDataError('Lot not found', 404, 'missing_entity')
    }

    const lot = store.lots[lotIndex]
    if (!lotIsFarmerOriginHeldAtFarm(lot)) {
      throw new MasterDataError(
        'Aggregator validation applies only to farmer-held origin lots',
        400,
        'validation_not_applicable',
      )
    }
    if (lot.validationStatus !== 'PENDING') {
      throw new MasterDataError('Lot is not awaiting validation', 400, 'invalid_validation_state')
    }
    if (input.observedWeight <= 0) {
      throw new MasterDataError('Observed weight must be positive', 400, 'invalid_quantity')
    }

    const timestamp = new Date().toISOString()
    const declaredWeight = lot.weight

    const next: Lot = {
      ...lot,
      validationStatus: input.decision,
      validatedByUserId: input.actorId,
      validatedAt: timestamp,
      observedWeight: input.observedWeight,
      validationNotes: input.validationNotes,
      weight: input.decision === 'VALIDATED' ? input.observedWeight : lot.weight,
      updatedAt: timestamp,
    }

    store.lots[lotIndex] = next

    const event: Event = {
      id: createEventId(),
      type: 'VALIDATE_LOT',
      timestamp,
      actorId: input.actorId,
      actorRole: actor.role,
      inputLotIds: [lot.id],
      outputLotIds: [lot.id],
      metadata: {
        decision: input.decision,
        declaredWeight,
        observedWeight: input.observedWeight,
        validationNotes: input.validationNotes,
      },
    }

    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)
    await runIntegrityEngine(projectRoot, { apply: true })

    return { lot: next, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid validate lot payload',
      400,
      'invalid_payload',
    )
  }
}
