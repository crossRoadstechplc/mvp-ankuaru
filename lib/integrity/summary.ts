import type { LiveDataStore } from '@/lib/domain/types'

export type IntegritySummary = {
  totalLots: number
  compromisedCount: number
  quarantinedCount: number
  integrityFlaggedEventCount: number
  /** Lots with any integrity issue in the last evaluation sense (snapshot: integrity ≠ OK). */
  compromisedLotIds: string[]
  /** Distinct issue codes currently present on lots (derived from quarantine text is brittle; use evaluation in run API). */
  lotsWithQuarantineReason: number
}

export const buildIntegritySummary = (store: LiveDataStore): IntegritySummary => {
  const compromised = store.lots.filter((l) => l.integrityStatus !== 'OK')
  const quarantined = store.lots.filter((l) => l.status === 'QUARANTINED')

  return {
    totalLots: store.lots.length,
    compromisedCount: compromised.length,
    quarantinedCount: quarantined.length,
    integrityFlaggedEventCount: store.events.filter((e) => e.type === 'INTEGRITY_FLAGGED').length,
    compromisedLotIds: compromised.map((l) => l.id),
    lotsWithQuarantineReason: store.lots.filter((l) => (l.quarantineReason?.length ?? 0) > 0).length,
  }
}
