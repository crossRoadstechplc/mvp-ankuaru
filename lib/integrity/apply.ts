import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'
import { createEventId } from '@/lib/events/ledger'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import type { IntegrityEvaluationResult, IntegrityIssue } from '@/lib/integrity/evaluate'

const summarize = (issues: IntegrityIssue[]): string =>
  issues.map((i) => `[${i.code}] ${i.detail}`).join(' | ')

export type ApplyIntegrityResult = {
  updatedLots: Lot[]
  eventsAppended: Event[]
}

/**
 * Sets compromised + quarantine on affected lots and appends INTEGRITY_FLAGGED when transitioning from clean state.
 */
export const applyIntegrityQuarantine = async (
  store: LiveDataStore,
  evaluation: IntegrityEvaluationResult,
  projectRoot: string,
): Promise<ApplyIntegrityResult> => {
  const updatedLots: Lot[] = []
  const eventsAppended: Event[] = []
  const ts = new Date().toISOString()

  for (const [lotId, issues] of evaluation.issuesByLotId) {
    if (issues.length === 0) {
      continue
    }

    const idx = store.lots.findIndex((l) => l.id === lotId)
    if (idx < 0) {
      continue
    }

    const lot = store.lots[idx]
    const wasClean = lot.integrityStatus === 'OK' && lot.status !== 'QUARANTINED'

    const next: Lot = {
      ...lot,
      integrityStatus: 'COMPROMISED',
      status: 'QUARANTINED',
      quarantineReason: summarize(issues),
      updatedAt: ts,
    }
    store.lots[idx] = next
    updatedLots.push(next)

    if (wasClean) {
      const ev: Event = {
        id: createEventId(),
        type: 'INTEGRITY_FLAGGED',
        timestamp: ts,
        actorId: 'system-integrity',
        actorRole: 'admin',
        inputLotIds: [lotId],
        outputLotIds: [lotId],
        metadata: {
          issues: issues.map((i) => ({ code: i.code, detail: i.detail })),
          lotId,
        },
      }
      store.events.push(ev)
      eventsAppended.push(ev)
    }
  }

  if (updatedLots.length > 0 || eventsAppended.length > 0) {
    await writeLiveDataStore(store, projectRoot)
  }
  return { updatedLots, eventsAppended }
}

/** Loads store, merges evaluation, writes. */
export const runIntegrityQuarantinePipeline = async (
  projectRoot: string,
  evaluation: IntegrityEvaluationResult,
): Promise<ApplyIntegrityResult> => {
  const store = await readLiveDataStore(projectRoot)
  return applyIntegrityQuarantine(store, evaluation, projectRoot)
}
