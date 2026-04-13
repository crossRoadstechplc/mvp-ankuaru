import type { Event, LabResult, Lot } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { MasterDataError, generateEntityId } from '@/lib/master-data/crud'
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

const asOptionalNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`)
  }
  return value
}

const asOptionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return asTrimmedString(value, label)
}

const asOptionalRecord = (value: unknown, label: string): Record<string, unknown> | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

/** Workflow statuses recorded by the lab UI (not NOT_REQUIRED). */
const WORKFLOW_LAB_STATUSES = ['PENDING', 'APPROVED', 'FAILED'] as const

type WorkflowLabStatus = (typeof WORKFLOW_LAB_STATUSES)[number]

const isWorkflowStatus = (value: string): value is WorkflowLabStatus =>
  (WORKFLOW_LAB_STATUSES as readonly string[]).includes(value)

export type SubmitLabResultRequest = {
  lotId: string
  labUserId: string
  status: WorkflowLabStatus
  score?: number
  notes?: string
  metadata?: Record<string, unknown>
}

export const parseSubmitLabResultRequest = (value: unknown): SubmitLabResultRequest => {
  const input = asRecord(value, 'labSubmit')
  const lotId = asTrimmedString(input.lotId, 'labSubmit.lotId')
  const labUserId = asTrimmedString(input.labUserId, 'labSubmit.labUserId')
  const statusRaw = asTrimmedString(input.status, 'labSubmit.status')
  if (!isWorkflowStatus(statusRaw)) {
    throw new Error(`labSubmit.status must be one of ${WORKFLOW_LAB_STATUSES.join(', ')}`)
  }
  const score = asOptionalNumber(input.score, 'labSubmit.score')
  const notes = asOptionalString(input.notes, 'labSubmit.notes')
  const metadata = asOptionalRecord(input.metadata, 'labSubmit.metadata')
  return { lotId, labUserId, status: statusRaw, score, notes, metadata }
}

const nextLotOperationalStatus = (lot: Lot, labStatus: WorkflowLabStatus): Lot['status'] => {
  if (labStatus === 'APPROVED' && lot.status === 'AT_LAB') {
    return 'READY_FOR_EXPORT'
  }
  if (labStatus === 'FAILED' && lot.status === 'AT_LAB') {
    return 'QUARANTINED'
  }
  return lot.status
}

export type SubmitLabResultOutcome = {
  labResult: LabResult
  lot: Lot
  event: Event
}

/**
 * Creates a lab result row, updates the lot snapshot, and appends a LAB_RESULT ledger event.
 */
export const submitLabResult = async (
  payload: unknown,
  projectRoot: string,
): Promise<SubmitLabResultOutcome> => {
  try {
    const req = parseSubmitLabResultRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((user) => user.id === req.labUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Lab user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'lab' && actor.role !== 'admin') {
      throw new MasterDataError('Only lab or admin users can submit lab results', 403, 'forbidden_role')
    }

    const lotIndex = store.lots.findIndex((lot) => lot.id === req.lotId)
    if (lotIndex < 0) {
      throw new MasterDataError('Lot not found', 404, 'missing_entity')
    }

    const lot = store.lots[lotIndex]
    if (lot.labStatus === 'NOT_REQUIRED' && lot.status !== 'AT_LAB') {
      throw new MasterDataError('This lot does not require lab quality tracking', 400, 'lab_not_applicable')
    }

    const timestamp = new Date().toISOString()
    const labResultId = generateEntityId('labResults')

    const labResult: LabResult = {
      id: labResultId,
      lotId: req.lotId,
      labUserId: req.labUserId,
      status: req.status,
      score: req.score,
      notes: req.notes,
      metadata: req.metadata,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    const updatedLot: Lot = {
      ...lot,
      labStatus: req.status,
      status: nextLotOperationalStatus(lot, req.status),
      updatedAt: timestamp,
    }

    store.lots[lotIndex] = updatedLot
    store.labResults.unshift(labResult)

    const event: Event = {
      id: createEventId(),
      type: 'LAB_RESULT',
      timestamp,
      actorId: req.labUserId,
      actorRole: actor.role,
      inputLotIds: [req.lotId],
      outputLotIds: [req.lotId],
      metadata: {
        labResultId,
        labStatus: req.status,
        score: req.score,
        notes: req.notes,
        qualityMetadata: req.metadata ?? {},
      },
    }

    store.events.push(event)
    await writeLiveDataStore(store, projectRoot)

    return { labResult, lot: updatedLot, event }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid lab submission',
      400,
      'invalid_payload',
    )
  }
}
