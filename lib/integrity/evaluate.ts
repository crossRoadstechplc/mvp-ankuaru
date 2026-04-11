import type { ByproductMasses } from '@/lib/lots/processing-mass-balance'
import { isMassBalanced, sumLedgerByproductsKg } from '@/lib/lots/processing-mass-balance'
import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'
import { getParentLotIds } from '@/lib/traceability/lineage-graph'
import { compareSnapshotLineageToEvents } from '@/lib/traceability/lineage-policy'

export type IntegrityIssueCode =
  | 'TIMELINE_ORDER'
  | 'MASS_IMBALANCE'
  | 'MISSING_SEQUENCE'
  | 'LINEAGE_SNAPSHOT_DRIFT'

export type IntegrityIssue = {
  code: IntegrityIssueCode
  detail: string
}

export type IntegrityEvaluationResult = {
  /** Lot id → issues (empty if OK). */
  issuesByLotId: Map<string, IntegrityIssue[]>
}

const emptyByproducts = (): ByproductMasses => ({
  pulp: 0,
  husk: 0,
  parchment: 0,
  defects: 0,
  moistureLoss: 0,
})

const ledgerByproductsToMasses = (event: Event): ByproductMasses => {
  const b = event.byproducts
  if (!b) {
    return emptyByproducts()
  }
  return {
    pulp: b.pulp ?? 0,
    husk: b.husk ?? 0,
    parchment: b.parchment ?? 0,
    defects: b.defects ?? 0,
    moistureLoss: b.moistureLoss ?? 0,
  }
}

/** Events that reference the lot, in ledger (append) order. */
export const eventsTouchingLotInLedgerOrder = (lotId: string, events: Event[]): Event[] =>
  events.filter((e) => e.inputLotIds.includes(lotId) || e.outputLotIds.includes(lotId))

const checkTimelineOrder = (lotId: string, events: Event[]): IntegrityIssue[] => {
  const touching = eventsTouchingLotInLedgerOrder(lotId, events)
  if (touching.length < 2) {
    return []
  }
  const sorted = [...touching].sort((a, b) => {
    const byTs = a.timestamp.localeCompare(b.timestamp)
    return byTs !== 0 ? byTs : a.id.localeCompare(b.id)
  })
  const ledgerIds = touching.map((e) => e.id)
  const sortedIds = sorted.map((e) => e.id)
  if (ledgerIds.join('|') !== sortedIds.join('|')) {
    return [
      {
        code: 'TIMELINE_ORDER',
        detail: `Events involving lot ${lotId} are not in chronological order in the append-only ledger.`,
      },
    ]
  }
  return []
}

const checkProcessMass = (event: Event): IntegrityIssue[] => {
  if (event.type !== 'PROCESS') {
    return []
  }
  const inputQty = event.inputQty
  const outputQty = event.outputQty
  if (inputQty === undefined || outputQty === undefined) {
    return [
      {
        code: 'MASS_IMBALANCE',
        detail: `PROCESS ${event.id} missing inputQty/outputQty for mass validation.`,
      },
    ]
  }
  const masses = ledgerByproductsToMasses(event)
  if (!isMassBalanced(inputQty, outputQty, masses)) {
    const leak = inputQty - outputQty - sumLedgerByproductsKg(event.byproducts)
    return [
      {
        code: 'MASS_IMBALANCE',
        detail: `PROCESS ${event.id} mass not balanced (input ${inputQty} vs output+byproducts; residual ~${leak.toFixed(4)} kg).`,
      },
    ]
  }
  return []
}

const checkCherryPick = (lot: Lot, events: Event[]): IntegrityIssue[] => {
  if (lot.form !== 'CHERRY') {
    return []
  }
  const hasPick = events.some((e) => e.type === 'PICK' && e.outputLotIds.includes(lot.id))
  const hasTransformOrigin = events.some((e) =>
    ['AGGREGATE', 'DISAGGREGATE', 'PROCESS'].includes(e.type) && e.outputLotIds.includes(lot.id),
  )
  if (!hasPick && !hasTransformOrigin) {
    return [
      {
        code: 'MISSING_SEQUENCE',
        detail: `CHERRY lot ${lot.id} has no PICK or transform event (AGGREGATE/DISAGGREGATE/PROCESS) producing it.`,
      },
    ]
  }
  return []
}

const checkParentLineageEvent = (lot: Lot, events: Event[]): IntegrityIssue[] => {
  const parentsFromEvents = getParentLotIds(lot.id, events)
  if (parentsFromEvents.length === 0) {
    return []
  }
  const ok = events.some(
    (e) =>
      ['PROCESS', 'AGGREGATE', 'DISAGGREGATE'].includes(e.type) &&
      e.outputLotIds.includes(lot.id) &&
      parentsFromEvents.some((p) => e.inputLotIds.includes(p)),
  )
  if (!ok) {
    return [
      {
        code: 'MISSING_SEQUENCE',
        detail: `Lot ${lot.id} has event-derived parents ${parentsFromEvents.join(', ')} but no PROCESS/AGGREGATE/DISAGGREGATE event linking them.`,
      },
    ]
  }
  return []
}

const checkLineageSnapshotDrift = (lot: Lot, events: Event[]): IntegrityIssue[] => {
  const drift = compareSnapshotLineageToEvents(lot, events)
  if (!drift) {
    return []
  }
  return [
    {
      code: 'LINEAGE_SNAPSHOT_DRIFT',
      detail: `Lot ${lot.id}: snapshot parent/child ids differ from ledger-derived edges (parents snap [${drift.snapshotParents.join(', ')}] vs events [${drift.expectedParents.join(', ')}]; children snap [${drift.snapshotChildren.join(', ')}] vs events [${drift.expectedChildren.join(', ')}]).`,
    },
  ]
}

/**
 * Deterministic integrity rules: timeline order per lot, PROCESS mass balance, required PICK / lineage events.
 */
export const evaluateStoreIntegrity = (store: LiveDataStore): IntegrityEvaluationResult => {
  const issuesByLotId = new Map<string, IntegrityIssue[]>()

  const add = (lotId: string, issue: IntegrityIssue) => {
    const prev = issuesByLotId.get(lotId) ?? []
    prev.push(issue)
    issuesByLotId.set(lotId, prev)
  }

  for (const lot of store.lots) {
    for (const issue of checkTimelineOrder(lot.id, store.events)) {
      add(lot.id, issue)
    }
    for (const issue of checkCherryPick(lot, store.events)) {
      add(lot.id, issue)
    }
    for (const issue of checkParentLineageEvent(lot, store.events)) {
      add(lot.id, issue)
    }
    for (const issue of checkLineageSnapshotDrift(lot, store.events)) {
      add(lot.id, issue)
    }
  }

  for (const event of store.events) {
    for (const issue of checkProcessMass(event)) {
      for (const id of new Set([...event.inputLotIds, ...event.outputLotIds])) {
        add(id, issue)
      }
    }
  }

  return { issuesByLotId }
}
