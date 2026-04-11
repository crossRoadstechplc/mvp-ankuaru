import type { Event, Lot } from '@/lib/domain/types'
import { evaluateStoreIntegrity } from '@/lib/integrity/evaluate'
import { applyIntegrityQuarantine } from '@/lib/integrity/apply'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { repairLotLineageSnapshotsFromEvents } from '@/lib/traceability/lineage-policy'

import type { IntegrityEvaluationResult } from '@/lib/integrity/evaluate'

export type RunIntegrityEngineOptions = {
  /** When true (default), quarantine lots and append INTEGRITY_FLAGGED events. */
  apply: boolean
}

export type RunIntegrityEngineResult = {
  evaluation: IntegrityEvaluationResult
  updatedLots: Lot[]
  eventsAppended: Event[]
}

/**
 * Full-store integrity scan. Optionally applies quarantine updates.
 */
export const runIntegrityEngine = async (
  projectRoot: string,
  options: RunIntegrityEngineOptions = { apply: true },
): Promise<RunIntegrityEngineResult> => {
  let store = await readLiveDataStore(projectRoot)

  if (options.apply) {
    const repaired = repairLotLineageSnapshotsFromEvents(store)
    if (repaired.length > 0) {
      await writeLiveDataStore(store, projectRoot)
      store = await readLiveDataStore(projectRoot)
    }
  }

  const evaluation = evaluateStoreIntegrity(store)

  if (!options.apply) {
    return { evaluation, updatedLots: [], eventsAppended: [] }
  }

  const applied = await applyIntegrityQuarantine(store, evaluation, projectRoot)
  return { evaluation, ...applied }
}
