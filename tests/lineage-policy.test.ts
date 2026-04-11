// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import type { Event, LiveDataStore, Lot } from '@/lib/domain/types'
import {
  compareSnapshotLineageToEvents,
  repairLotLineageSnapshotsFromEvents,
  resolveOriginFieldThroughLineage,
} from '@/lib/traceability/lineage-policy'

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

describe('lineage policy', () => {
  it('compareSnapshotLineageToEvents returns null when snapshots match ledger edges', () => {
    const store = cloneSeedData()
    for (const lot of store.lots) {
      expect(compareSnapshotLineageToEvents(lot, store.events)).toBeNull()
    }
  })

  it('compareSnapshotLineageToEvents detects drift when snapshot parents disagree with events', () => {
    const store = cloneSeedData()
    const lot = store.lots.find((l) => l.id === 'lot-cherry-001')
    expect(lot).toBeDefined()
    const tampered: Lot = { ...lot!, parentLotIds: ['fake-parent'] }
    const drift = compareSnapshotLineageToEvents(tampered, store.events)
    expect(drift).not.toBeNull()
    expect(drift?.lotId).toBe('lot-cherry-001')
    expect(drift?.snapshotParents).toContain('fake-parent')
  })

  it('repairLotLineageSnapshotsFromEvents aligns snapshots to event-derived edges', () => {
    const store = cloneSeedData()
    const idx = store.lots.findIndex((l) => l.id === 'lot-cherry-001')
    expect(idx).toBeGreaterThanOrEqual(0)
    store.lots[idx] = { ...store.lots[idx], parentLotIds: ['nope'] }
    const updated = repairLotLineageSnapshotsFromEvents(store)
    expect(updated.some((l) => l.id === 'lot-cherry-001')).toBe(true)
    expect(compareSnapshotLineageToEvents(store.lots[idx], store.events)).toBeNull()
  })

  it('resolveOriginFieldThroughLineage finds field via upstream lots when snapshot omits fieldId', () => {
    const base = cloneSeedData()
    const parent = minimalLot({
      id: 'lot-farm-r7',
      fieldId: 'field-001',
      farmerId: 'user-farmer-001',
    })
    const child = minimalLot({
      id: 'lot-proc-r7',
      parentLotIds: ['lot-farm-r7'],
      fieldId: undefined,
      farmerId: undefined,
    })
    const ev: Event = {
      id: 'ev-p-r7',
      type: 'PROCESS',
      timestamp: '2026-01-03T00:00:00.000Z',
      actorId: 'user-processor-001',
      actorRole: 'processor',
      inputLotIds: ['lot-farm-r7'],
      outputLotIds: ['lot-proc-r7'],
      inputQty: 100,
      outputQty: 100,
    }
    const store: LiveDataStore = {
      ...base,
      lots: [...base.lots, parent, child],
      events: [...base.events, ev],
    }
    const r = resolveOriginFieldThroughLineage(store, 'lot-proc-r7')
    expect(r.fieldId).toBe('field-001')
    expect(r.pathLotIds).toContain('lot-proc-r7')
    expect(r.pathLotIds).toContain('lot-farm-r7')
  })
})
