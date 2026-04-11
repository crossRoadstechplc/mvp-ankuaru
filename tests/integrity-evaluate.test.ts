// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { evaluateStoreIntegrity } from '@/lib/integrity/evaluate'
import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'

const minimalLot = (overrides: Partial<Lot>): Lot => ({
  id: 'lot-x',
  publicLotCode: 'X',
  internalUuid: 'u',
  traceKey: 't',
  form: 'GREEN',
  weight: 100,
  ownerId: 'o',
  ownerRole: 'farmer',
  custodianId: 'o',
  custodianRole: 'farmer',
  parentLotIds: [],
  childLotIds: [],
  status: 'ACTIVE',
  labStatus: 'NOT_REQUIRED',
  isCollateral: false,
  integrityStatus: 'OK',
  validationStatus: 'VALIDATED',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('evaluateStoreIntegrity', () => {
  it('detects PROCESS mass imbalance', () => {
    const store = cloneSeedData()
    const process = store.events.find((e) => e.type === 'PROCESS')
    expect(process).toBeDefined()
    if (process && process.inputQty !== undefined && process.outputQty !== undefined) {
      process.outputQty = process.outputQty - 50
    }
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    const touched = [...process!.inputLotIds, ...process!.outputLotIds]
    for (const id of touched) {
      const issues = issuesByLotId.get(id) ?? []
      expect(issues.some((i) => i.code === 'MASS_IMBALANCE')).toBe(true)
    }
  })

  it('allows CHERRY lot created only via AGGREGATE (no PICK)', () => {
    const cherry: Lot = minimalLot({
      id: 'lot-cherry-agg',
      form: 'CHERRY',
      parentLotIds: ['p1', 'p2'],
    })
    const ev: Event = {
      id: 'ev-agg',
      type: 'AGGREGATE',
      timestamp: '2026-01-02T00:00:00.000Z',
      actorId: 'a',
      actorRole: 'aggregator',
      inputLotIds: ['p1', 'p2'],
      outputLotIds: ['lot-cherry-agg'],
    }
    const store: LiveDataStore = {
      ...cloneSeedData(),
      lots: [cherry],
      events: [ev],
    }
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    const issues = issuesByLotId.get('lot-cherry-agg') ?? []
    expect(issues.filter((i) => i.code === 'MISSING_SEQUENCE')).toHaveLength(0)
  })

  it('detects CHERRY lot without PICK', () => {
    const cherry: Lot = minimalLot({
      id: 'lot-cherry-orphan',
      form: 'CHERRY',
      parentLotIds: [],
    })
    const store: LiveDataStore = {
      ...cloneSeedData(),
      lots: [cherry],
      events: [],
    }
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    expect(issuesByLotId.get('lot-cherry-orphan')?.some((i) => i.code === 'MISSING_SEQUENCE')).toBe(true)
  })

  it('detects invalid ledger timeline order for a lot', () => {
    const e1: Event = {
      id: 'ev-later',
      type: 'TRANSFER_CUSTODY',
      timestamp: '2026-02-02T12:00:00.000Z',
      actorId: 'a',
      actorRole: 'processor',
      inputLotIds: ['lot-t'],
      outputLotIds: ['lot-t'],
    }
    const e2: Event = {
      id: 'ev-earlier',
      type: 'TRANSFER_CUSTODY',
      timestamp: '2026-02-01T12:00:00.000Z',
      actorId: 'a',
      actorRole: 'processor',
      inputLotIds: ['lot-t'],
      outputLotIds: ['lot-t'],
    }
    const lot = minimalLot({ id: 'lot-t' })
    const store: LiveDataStore = {
      ...cloneSeedData(),
      lots: [lot],
      events: [e1, e2],
    }
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    expect(issuesByLotId.get('lot-t')?.some((i) => i.code === 'TIMELINE_ORDER')).toBe(true)
  })

  it('finds no issues on canonical seed data', () => {
    const store = cloneSeedData()
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    expect(issuesByLotId.size).toBe(0)
  })

  it('detects LINEAGE_SNAPSHOT_DRIFT when snapshot edges disagree with the ledger', () => {
    const store = cloneSeedData()
    const idx = store.lots.findIndex((l) => l.id === 'lot-cherry-001')
    expect(idx).toBeGreaterThanOrEqual(0)
    store.lots[idx] = { ...store.lots[idx], childLotIds: ['fake-child'] }
    const { issuesByLotId } = evaluateStoreIntegrity(store)
    const issues = issuesByLotId.get('lot-cherry-001') ?? []
    expect(issues.some((i) => i.code === 'LINEAGE_SNAPSHOT_DRIFT')).toBe(true)
  })
})
