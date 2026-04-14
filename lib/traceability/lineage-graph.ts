import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'

/**
 * Lineage is derived from the append-only event ledger: edges go from input lots → output lots
 * within each event. The overall structure is a DAG (multiple parents / children allowed).
 */

export const getParentLotIds = (lotId: string, events: readonly Event[]): string[] => {
  const parents = new Set<string>()
  for (const event of events) {
    if (!event.outputLotIds.includes(lotId)) {
      continue
    }
    for (const inputId of event.inputLotIds) {
      if (inputId && inputId !== lotId) {
        parents.add(inputId)
      }
    }
  }
  return [...parents]
}

export const getChildLotIds = (lotId: string, events: readonly Event[]): string[] => {
  const children = new Set<string>()
  for (const event of events) {
    if (!event.inputLotIds.includes(lotId)) {
      continue
    }
    for (const outputId of event.outputLotIds) {
      if (outputId && outputId !== lotId) {
        children.add(outputId)
      }
    }
  }
  return [...children]
}

export const getLotById = (store: LiveDataStore, lotId: string): Lot | undefined =>
  store.lots.find((lot) => lot.id === lotId)

export const getParentLots = (lotId: string, store: LiveDataStore): Lot[] => {
  const ids = getParentLotIds(lotId, store.events)
  return ids
    .map((id) => getLotById(store, id))
    .filter((lot): lot is Lot => lot !== undefined)
}

export const getChildLots = (lotId: string, store: LiveDataStore): Lot[] => {
  const ids = getChildLotIds(lotId, store.events)
  return ids
    .map((id) => getLotById(store, id))
    .filter((lot): lot is Lot => lot !== undefined)
}

export type TraceTraversalResult = {
  /** BFS order starting from `startLotId` (included first), following the chosen direction. */
  orderedLotIds: string[]
}

/**
 * Walk backward through input edges (toward origins). Uses a visited set to avoid cycles.
 */
export const traceBackward = (startLotId: string, events: readonly Event[]): TraceTraversalResult => {
  const orderedLotIds: string[] = []
  const visited = new Set<string>()
  const queue: string[] = [startLotId]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) {
      continue
    }
    visited.add(id)
    orderedLotIds.push(id)

    for (const parentId of getParentLotIds(id, events)) {
      if (!visited.has(parentId)) {
        queue.push(parentId)
      }
    }
  }

  return { orderedLotIds }
}

/**
 * Walk forward through output edges (toward descendants). Uses a visited set to avoid cycles.
 */
export const traceForward = (startLotId: string, events: readonly Event[]): TraceTraversalResult => {
  const orderedLotIds: string[] = []
  const visited = new Set<string>()
  const queue: string[] = [startLotId]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) {
      continue
    }
    visited.add(id)
    orderedLotIds.push(id)

    for (const childId of getChildLotIds(id, events)) {
      if (!visited.has(childId)) {
        queue.push(childId)
      }
    }
  }

  return { orderedLotIds }
}

export type LotLineageHints = {
  isAggregateOutput: boolean
  aggregateSourceCount: number
  isDisaggregateSource: boolean
  disaggregateChildCount: number
}

/** Flags from explicit AGGREGATE / DISAGGREGATE ledger events (not generic PROCESS). */
export const getLotLineageHints = (lotId: string, events: readonly Event[]): LotLineageHints => {
  let isAggregateOutput = false
  let aggregateSourceCount = 0
  let isDisaggregateSource = false
  let disaggregateChildCount = 0

  for (const event of events) {
    if (
      event.type === 'AGGREGATE' &&
      event.outputLotIds.includes(lotId) &&
      event.inputLotIds.length >= 2
    ) {
      isAggregateOutput = true
      aggregateSourceCount = Math.max(aggregateSourceCount, event.inputLotIds.length)
    }
    if (
      event.type === 'DISAGGREGATE' &&
      event.inputLotIds.includes(lotId) &&
      event.outputLotIds.length >= 2
    ) {
      isDisaggregateSource = true
      disaggregateChildCount = Math.max(disaggregateChildCount, event.outputLotIds.length)
    }
  }

  return {
    isAggregateOutput,
    aggregateSourceCount,
    isDisaggregateSource,
    disaggregateChildCount,
  }
}

export type LineageTreeNode = {
  lotId: string
  /** Safe display label — prefer public lot code. */
  publicLotCode: string
  form: string
  status: string
  /** True when this id was already expanded elsewhere in this tree (DAG merge / cycle guard). */
  truncatedReference?: boolean
  branches: LineageTreeNode[]
}

const safeLotSnapshot = (
  lot: Lot | undefined,
  lotId: string,
): { publicLotCode: string; form: string; status: string } => {
  if (!lot) {
    return { publicLotCode: lotId, form: '—', status: '—' }
  }
  return {
    publicLotCode: lot.publicLotCode,
    form: lot.form,
    status: lot.status,
  }
}

/**
 * Expandable tree toward origins (parents). Shared `visited` prevents infinite recursion on cycles.
 */
export const buildBackwardLineageTree = (
  lotId: string,
  store: LiveDataStore,
  visited: Set<string> = new Set(),
  /** Depth from the starting lot (0 = focal lot). When `maxLevel` is set, stops expanding parents at this depth. */
  level: number = 0,
  /** When set, only expand parents while `level < maxLevel` (1 = focal lot + direct parents only). */
  maxLevel?: number,
): LineageTreeNode => {
  const lot = getLotById(store, lotId)
  const snap = safeLotSnapshot(lot, lotId)

  if (visited.has(lotId)) {
    return {
      lotId,
      publicLotCode: snap.publicLotCode,
      form: snap.form,
      status: snap.status,
      truncatedReference: true,
      branches: [],
    }
  }
  visited.add(lotId)

  const parentIds = getParentLotIds(lotId, store.events)
  const stopHere = maxLevel !== undefined && level >= maxLevel
  const branches = stopHere
    ? []
    : parentIds.map((parentId) => buildBackwardLineageTree(parentId, store, visited, level + 1, maxLevel))

  return {
    lotId,
    publicLotCode: snap.publicLotCode,
    form: snap.form,
    status: snap.status,
    branches,
  }
}

/**
 * Expandable tree toward descendants (children). Shared `visited` prevents infinite recursion on cycles.
 */
export const buildForwardLineageTree = (
  lotId: string,
  store: LiveDataStore,
  visited: Set<string> = new Set(),
  level: number = 0,
  maxLevel?: number,
): LineageTreeNode => {
  const lot = getLotById(store, lotId)
  const snap = safeLotSnapshot(lot, lotId)

  if (visited.has(lotId)) {
    return {
      lotId,
      publicLotCode: snap.publicLotCode,
      form: snap.form,
      status: snap.status,
      truncatedReference: true,
      branches: [],
    }
  }
  visited.add(lotId)

  const childIds = getChildLotIds(lotId, store.events)
  const stopHere = maxLevel !== undefined && level >= maxLevel
  const branches = stopHere
    ? []
    : childIds.map((childId) => buildForwardLineageTree(childId, store, visited, level + 1, maxLevel))

  return {
    lotId,
    publicLotCode: snap.publicLotCode,
    form: snap.form,
    status: snap.status,
    branches,
  }
}
