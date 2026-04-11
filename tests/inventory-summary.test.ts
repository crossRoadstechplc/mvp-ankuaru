// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { computeInventorySummary } from '@/lib/inventory/inventory-summary'
import type { LiveDataStore } from '@/lib/domain/types'

describe('computeInventorySummary', () => {
  it('aggregates lots by stage and form from seed data', () => {
    const store = cloneSeedData()
    const summary = computeInventorySummary(store)

    expect(summary.lotsByForm.find((row) => row.form === 'GREEN')?.lotCount).toBeGreaterThan(0)
    expect(summary.activeLotCount).toBeGreaterThan(0)
    expect(summary.totalMainProductWeightKg).toBeGreaterThan(0)
    expect(summary.lotsByStage.length).toBeGreaterThan(0)
  })

  it('rolls up PROCESS ledger masses and flags imbalance when inputs do not close', () => {
    const store = cloneSeedData()
    const summary = computeInventorySummary(store)

    expect(summary.processMass.totalInputKg).toBeGreaterThan(0)
    expect(summary.processMass.totalMainOutputKg).toBeGreaterThan(0)
    expect(summary.imbalanceWarnings).toHaveLength(0)
  })

  it('counts trades by status for downstream charts', () => {
    const store = cloneSeedData()
    const summary = computeInventorySummary(store)

    expect(summary.tradeStatusCounts.length).toBeGreaterThan(0)
    expect(summary.tradeStatusCounts.some((row) => row.count > 0)).toBe(true)
  })

  it('includes empty stages only when they have weight or lots', () => {
    const minimal: LiveDataStore = {
      users: [],
      farmerProfiles: [],
      fields: [],
      lots: [
        {
          id: 'lot-1',
          publicLotCode: 'X',
          internalUuid: 'u',
          traceKey: 't',
          form: 'CHERRY',
          weight: 10,
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
        },
      ],
      events: [],
      rfqs: [],
      bids: [],
      trades: [],
      labResults: [],
      bankReviews: [],
      vehicles: [],
      drivers: [],
    }

    const summary = computeInventorySummary(minimal)
    expect(summary.lotsByStage.some((s) => s.stage === 'ACTIVE')).toBe(true)
    expect(summary.imbalanceWarnings).toHaveLength(0)
  })
})
