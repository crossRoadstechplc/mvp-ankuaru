// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { summarizeByproductInventory } from '@/lib/lots/byproduct-inventory'
import { parseProcessLotRequest, processLot } from '@/lib/lots/processing-engine'
import {
  isMassBalanced,
  sumByproductMasses,
  sumLedgerByproductsKg,
} from '@/lib/lots/processing-mass-balance'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { mockSessionHeaders } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }

describe('processing engine validation', () => {
  it('sumByproductMasses adds all streams', () => {
    expect(
      sumByproductMasses({
        pulp: 1,
        husk: 2,
        parchment: 3,
        defects: 4,
        moistureLoss: 5,
      }),
    ).toBe(15)
  })

  it('isMassBalanced enforces input = output + byproducts', () => {
    const bp = { pulp: 10, husk: 5, parchment: 0, defects: 0, moistureLoss: 2 }
    expect(isMassBalanced(100, 83, bp)).toBe(true)
    expect(isMassBalanced(100, 80, bp)).toBe(false)
  })

  it('sumLedgerByproductsKg reads event byproducts', () => {
    expect(
      sumLedgerByproductsKg({
        pulp: 1,
        moistureLoss: 2,
      }),
    ).toBe(3)
  })

  it('parseProcessLotRequest rejects BYPRODUCT as main output form', () => {
    expect(() =>
      parseProcessLotRequest({
        inputLotId: 'lot-x',
        inputWeight: 10,
        outputWeight: 10,
        outputForm: 'BYPRODUCT',
        processingMethod: 'washed',
        actorId: 'user-processor-001',
        byproducts: { pulp: 0, husk: 0, parchment: 0, defects: 0, moistureLoss: 0 },
      }),
    ).toThrow()
  })

  it('parseProcessLotRequest defaults missing byproducts to zero', () => {
    const parsed = parseProcessLotRequest({
      inputLotId: 'lot-x',
      inputWeight: 50,
      outputWeight: 50,
      outputForm: 'GREEN',
      processingMethod: 'natural',
      actorId: 'user-processor-001',
    })
    expect(parsed.byproducts).toEqual({
      pulp: 0,
      husk: 0,
      parchment: 0,
      defects: 0,
      moistureLoss: 0,
    })
  })
})

describe('processLot integration', () => {
  afterEach(async () => {
    await cleanupTempProjectRoots()
  })

  it('creates primary and byproduct lots when mass balances', async () => {
    const projectRoot = await createTempProjectRoot()
    const { POST } = await import('@/app/api/farmer/lots/route')
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ankuaru-project-root': projectRoot,
          ...mockSessionHeaders(farmerSession),
        },
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          fieldId: 'field-001',
          weight: 500,
        }),
      }),
    )
    const { lot: source } = (await res.json()) as { lot: { id: string } }

    const store0 = await readLiveDataStore(projectRoot)
    store0.lots = store0.lots.map((l) =>
      l.id === source.id ? { ...l, status: 'READY_FOR_PROCESSING' as const } : l,
    )
    await writeLiveDataStore(store0, projectRoot)

    const result = await processLot(
      {
        inputLotId: source.id,
        inputWeight: 200,
        outputWeight: 120,
        outputForm: 'GREEN',
        processingMethod: 'washed',
        actorId: 'user-processor-001',
        byproducts: {
          pulp: 50,
          husk: 10,
          parchment: 10,
          defects: 5,
          moistureLoss: 5,
        },
      },
      projectRoot,
    )

    expect(result.event.type).toBe('PROCESS')
    expect(result.primaryLot).not.toBeNull()
    expect(result.byproductLots).toHaveLength(5)
    expect(result.byproductLots.map((lot) => lot.byproductKind).sort()).toEqual([
      'defects',
      'husk',
      'moistureLoss',
      'parchment',
      'pulp',
    ])
    expect(result.sourceLot.weight).toBe(300)

    const store = await readLiveDataStore(projectRoot)
    const summary = summarizeByproductInventory(store)
    expect(summary.length).toBe(5)
    expect(summary.reduce((s, row) => s + row.totalKg, 0)).toBe(80)
  })

  it('rejects mass imbalance', async () => {
    const projectRoot = await createTempProjectRoot()
    const { POST } = await import('@/app/api/farmer/lots/route')
    const res = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-ankuaru-project-root': projectRoot,
          ...mockSessionHeaders(farmerSession),
        },
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          fieldId: 'field-001',
          weight: 100,
        }),
      }),
    )
    const { lot: source } = (await res.json()) as { lot: { id: string } }

    const store0 = await readLiveDataStore(projectRoot)
    store0.lots = store0.lots.map((l) =>
      l.id === source.id ? { ...l, status: 'READY_FOR_PROCESSING' as const } : l,
    )
    await writeLiveDataStore(store0, projectRoot)

    await expect(
      processLot(
        {
          inputLotId: source.id,
          inputWeight: 100,
          outputWeight: 40,
          outputForm: 'GREEN',
          processingMethod: 'washed',
          actorId: 'user-processor-001',
          byproducts: {
            pulp: 10,
            husk: 10,
            parchment: 10,
            defects: 10,
            moistureLoss: 10,
          },
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'mass_balance_violation' })
  })
})

describe('byproduct inventory with seed data', () => {
  it('summarizes only lots with byproductKind set', () => {
    const store = cloneSeedData()
    const rows = summarizeByproductInventory(store)
    expect(rows.every((row) => row.totalKg >= 0)).toBe(true)
  })
})
