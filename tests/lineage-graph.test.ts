// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'
import {
  buildBackwardLineageTree,
  buildForwardLineageTree,
  getChildLotIds,
  getLotLineageHints,
  getParentLotIds,
  traceBackward,
  traceForward,
} from '@/lib/traceability/lineage-graph'

const baseLot = (partial: Partial<Lot> & Pick<Lot, 'id' | 'publicLotCode'>): Lot => ({
  internalUuid: '00000000-0000-4000-8000-000000000001',
  traceKey: 'TRK-TEST',
  fieldId: 'field-1',
  farmerId: 'user-farmer-001',
  form: 'CHERRY',
  weight: 100,
  ownerId: 'user-farmer-001',
  ownerRole: 'farmer',
  custodianId: 'user-farmer-001',
  custodianRole: 'farmer',
  parentLotIds: [],
  childLotIds: [],
  status: 'ACTIVE',
  labStatus: 'NOT_REQUIRED',
  isCollateral: false,
  integrityStatus: 'OK',
  validationStatus: 'VALIDATED',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...partial,
})

const ev = (partial: Partial<Event> & Pick<Event, 'id' | 'type' | 'inputLotIds' | 'outputLotIds'>): Event => ({
  timestamp: '2026-04-01T12:00:00.000Z',
  actorId: 'actor-1',
  actorRole: 'aggregator',
  inputQty: undefined,
  outputQty: undefined,
  ...partial,
})

describe('lineage graph helpers', () => {
  it('aggregation: many inputs map to one output lot', () => {
    const events: Event[] = [
      ev({
        id: 'agg-1',
        type: 'AGGREGATE',
        inputLotIds: ['lot-a', 'lot-b', 'lot-c'],
        outputLotIds: ['lot-m'],
      }),
    ]

    expect(getParentLotIds('lot-m', events).sort()).toEqual(['lot-a', 'lot-b', 'lot-c'])
    expect(getChildLotIds('lot-a', events)).toContain('lot-m')
    expect(getChildLotIds('lot-b', events)).toContain('lot-m')
    expect(getChildLotIds('lot-c', events)).toContain('lot-m')
  })

  it('split / processing: one input maps to many outputs (parallel branches)', () => {
    const events: Event[] = [
      ev({
        id: 'proc-1',
        type: 'PROCESS',
        inputLotIds: ['lot-x'],
        outputLotIds: ['lot-y', 'lot-z', 'lot-by'],
      }),
    ]

    expect(getParentLotIds('lot-y', events)).toEqual(['lot-x'])
    expect(getParentLotIds('lot-z', events)).toEqual(['lot-x'])
    expect(getParentLotIds('lot-by', events)).toEqual(['lot-x'])
    expect(getChildLotIds('lot-x', events).sort()).toEqual(['lot-by', 'lot-y', 'lot-z'])
  })

  it('traceBackward walks to all ancestors with BFS order', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['lot-root'] }),
      ev({ id: 'e2', type: 'PROCESS', inputLotIds: ['lot-root'], outputLotIds: ['lot-child'] }),
    ]
    const backward = traceBackward('lot-child', events)
    expect(backward.orderedLotIds).toEqual(['lot-child', 'lot-root'])
  })

  it('traceForward walks to all descendants', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['lot-root'] }),
      ev({
        id: 'e2',
        type: 'PROCESS',
        inputLotIds: ['lot-root'],
        outputLotIds: ['lot-y', 'lot-z'],
      }),
    ]
    const forward = traceForward('lot-root', events)
    expect(forward.orderedLotIds).toEqual(['lot-root', 'lot-y', 'lot-z'])
  })

  it('cycle protection: traceBackward terminates on a synthetic A↔B loop', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['A'] }),
      ev({ id: 'e2', type: 'PROCESS', inputLotIds: ['A'], outputLotIds: ['B'] }),
      ev({ id: 'e3', type: 'PROCESS', inputLotIds: ['B'], outputLotIds: ['A'] }),
    ]

    const backward = traceBackward('A', events)
    expect(backward.orderedLotIds.sort()).toEqual(['A', 'B'])
  })

  it('cycle protection: forward trace terminates when outputs feed back', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['A'] }),
      ev({ id: 'e2', type: 'PROCESS', inputLotIds: ['A'], outputLotIds: ['B'] }),
      ev({ id: 'e3', type: 'PROCESS', inputLotIds: ['B'], outputLotIds: ['A'] }),
    ]

    const forward = traceForward('A', events)
    expect(forward.orderedLotIds.sort()).toEqual(['A', 'B'])
  })

  it('buildBackwardLineageTree marks revisits without blowing the stack', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['A'] }),
      ev({ id: 'e2', type: 'PROCESS', inputLotIds: ['A'], outputLotIds: ['B'] }),
      ev({ id: 'e3', type: 'PROCESS', inputLotIds: ['B'], outputLotIds: ['A'] }),
    ]

    const lots: Lot[] = [
      baseLot({ id: 'A', publicLotCode: 'PLT-A' }),
      baseLot({ id: 'B', publicLotCode: 'PLT-B' }),
    ]

    const store: LiveDataStore = {
      users: [],
      farmerProfiles: [],
      fields: [],
      lots,
      events,
      rfqs: [],
      bids: [],
      trades: [],
      labResults: [],
      bankReviews: [],
      vehicles: [],
      drivers: [],
    }

    const tree = buildBackwardLineageTree('A', store)
    expect(tree.publicLotCode).toBe('PLT-A')
    expect(tree.branches).toHaveLength(1)
    expect(tree.branches[0].lotId).toBe('B')
    expect(tree.branches[0].branches.some((n) => n.truncatedReference)).toBe(true)
  })

  it('buildBackwardLineageTree respects maxLevel for direct parents only', () => {
    const events: Event[] = [
      ev({ id: 'e1', type: 'PICK', inputLotIds: [], outputLotIds: ['lot-a'] }),
      ev({ id: 'e2', type: 'PROCESS', inputLotIds: ['lot-a'], outputLotIds: ['lot-b'] }),
      ev({ id: 'e3', type: 'PROCESS', inputLotIds: ['lot-b'], outputLotIds: ['lot-c'] }),
    ]
    const lots: Lot[] = [
      baseLot({ id: 'lot-a', publicLotCode: 'A' }),
      baseLot({ id: 'lot-b', publicLotCode: 'B' }),
      baseLot({ id: 'lot-c', publicLotCode: 'C' }),
    ]
    const store: LiveDataStore = {
      users: [],
      farmerProfiles: [],
      fields: [],
      lots,
      events,
      rfqs: [],
      bids: [],
      trades: [],
      labResults: [],
      bankReviews: [],
      vehicles: [],
      drivers: [],
    }

    const tree = buildBackwardLineageTree('lot-c', store, new Set(), 0, 1)
    expect(tree.publicLotCode).toBe('C')
    expect(tree.branches).toHaveLength(1)
    expect(tree.branches[0].publicLotCode).toBe('B')
    expect(tree.branches[0].branches).toHaveLength(0)
  })

  it('buildForwardLineageTree fans out parallel outputs', () => {
    const events: Event[] = [
      ev({
        id: 'e2',
        type: 'PROCESS',
        inputLotIds: ['lot-root'],
        outputLotIds: ['lot-y', 'lot-z'],
      }),
    ]
    const lots: Lot[] = [
      baseLot({ id: 'lot-root', publicLotCode: 'ROOT' }),
      baseLot({ id: 'lot-y', publicLotCode: 'Y', form: 'GREEN' }),
      baseLot({ id: 'lot-z', publicLotCode: 'Z', form: 'BYPRODUCT' }),
    ]

    const store: LiveDataStore = {
      users: [],
      farmerProfiles: [],
      fields: [],
      lots,
      events,
      rfqs: [],
      bids: [],
      trades: [],
      labResults: [],
      bankReviews: [],
      vehicles: [],
      drivers: [],
    }

    const tree = buildForwardLineageTree('lot-root', store)
    expect(tree.branches.map((b) => b.publicLotCode).sort()).toEqual(['Y', 'Z'])
  })

  it('getLotLineageHints surfaces AGGREGATE and DISAGGREGATE semantics', () => {
    const events: Event[] = [
      ev({
        id: 'e-agg',
        type: 'AGGREGATE',
        inputLotIds: ['lot-a', 'lot-b'],
        outputLotIds: ['lot-out'],
      }),
      ev({
        id: 'e-dis',
        type: 'DISAGGREGATE',
        inputLotIds: ['lot-src'],
        outputLotIds: ['lot-c1', 'lot-c2', 'lot-c3'],
      }),
    ]

    expect(getLotLineageHints('lot-out', events)).toEqual({
      isAggregateOutput: true,
      aggregateSourceCount: 2,
      isDisaggregateSource: false,
      disaggregateChildCount: 0,
    })

    expect(getLotLineageHints('lot-src', events)).toEqual({
      isAggregateOutput: false,
      aggregateSourceCount: 0,
      isDisaggregateSource: true,
      disaggregateChildCount: 3,
    })
  })
})
