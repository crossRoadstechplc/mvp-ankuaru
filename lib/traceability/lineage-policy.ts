import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'

import { getChildLotIds, getParentLotIds, traceBackward, traceForward } from '@/lib/traceability/lineage-graph'

/**
 * ## Lineage policy (MVP)
 *
 * - **Events are the source of truth** for graph edges: `Event.inputLotIds` / `Event.outputLotIds`
 *   define parent/child relationships.
 * - **`Lot.parentLotIds` / `Lot.childLotIds`** are denormalized hints for fast UI and legacy reads.
 *   They must match edges derived from the ledger or are considered drift (see integrity engine).
 *
 * All user-facing trace views (`getParentLots`, lineage trees, lot detail) use **events**, not snapshots.
 */

const sortedKey = (ids: readonly string[]): string => [...ids].sort().join('\0')

export type LineageSnapshotDrift = {
  lotId: string
  expectedParents: string[]
  expectedChildren: string[]
  snapshotParents: string[]
  snapshotChildren: string[]
}

export const compareSnapshotLineageToEvents = (lot: Lot, events: readonly Event[]): LineageSnapshotDrift | null => {
  const expectedParents = getParentLotIds(lot.id, events).sort()
  const expectedChildren = getChildLotIds(lot.id, events).sort()
  const snapP = [...lot.parentLotIds].sort()
  const snapC = [...lot.childLotIds].sort()
  if (sortedKey(expectedParents) === sortedKey(snapP) && sortedKey(expectedChildren) === sortedKey(snapC)) {
    return null
  }
  return {
    lotId: lot.id,
    expectedParents,
    expectedChildren,
    snapshotParents: snapP,
    snapshotChildren: snapC,
  }
}

/**
 * Walks backward along event edges until a lot with `fieldId` is found (typically a farmer pick).
 * Used when aggregated/processed lots omit `fieldId` on the snapshot.
 */
export const resolveOriginFieldThroughLineage = (
  store: LiveDataStore,
  lotId: string,
): {
  fieldId?: string
  fieldName?: string
  farmerId?: string
  /** Lot ids from current back toward origin (current first). */
  pathLotIds: string[]
} => {
  const backward = traceBackward(lotId, store.events)
  const pathLotIds = backward.orderedLotIds
  for (const id of pathLotIds) {
    const lot = store.lots.find((l) => l.id === id)
    if (lot?.fieldId) {
      const field = store.fields.find((f) => f.id === lot.fieldId)
      return {
        fieldId: lot.fieldId,
        fieldName: field?.name,
        farmerId: lot.farmerId,
        pathLotIds,
      }
    }
  }
  return { pathLotIds }
}

/**
 * Ordered lot ids toward descendants (including start), for forward trace display.
 */
export const getForwardTraceLotIds = (lotId: string, events: readonly Event[]): string[] =>
  traceForward(lotId, events).orderedLotIds

/**
 * Ordered lot ids toward origins (including start), for backward trace display.
 */
export const getBackwardTraceLotIds = (lotId: string, events: readonly Event[]): string[] =>
  traceBackward(lotId, events).orderedLotIds

/**
 * Repair snapshot `parentLotIds` / `childLotIds` from the event ledger (in-memory).
 */
export const repairLotLineageSnapshotsFromEvents = (store: LiveDataStore): Lot[] => {
  const updated: Lot[] = []
  const ts = new Date().toISOString()
  for (let i = 0; i < store.lots.length; i++) {
    const lot = store.lots[i]
    const parents = getParentLotIds(lot.id, store.events)
    const children = getChildLotIds(lot.id, store.events)
    if (sortedKey(parents) === sortedKey(lot.parentLotIds) && sortedKey(children) === sortedKey(lot.childLotIds)) {
      continue
    }
    const next: Lot = {
      ...lot,
      parentLotIds: parents,
      childLotIds: children,
      updatedAt: ts,
    }
    store.lots[i] = next
    updated.push(next)
  }
  return updated
}
