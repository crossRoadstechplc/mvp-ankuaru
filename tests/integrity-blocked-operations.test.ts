// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { aggregateLots } from '@/lib/lots/lot-transformation'
import { processLot } from '@/lib/lots/processing-engine'
import { recordDispatch } from '@/lib/transport/record-dispatch'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

describe('blocked operational actions on integrity-failed lots', () => {
  it('rejects aggregation when a source lot is quarantined', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot).toBeDefined()
    store.lots = store.lots.map((l) =>
      l.id === 'lot-green-001'
        ? { ...l, status: 'QUARANTINED' as const, integrityStatus: 'COMPROMISED' as const }
        : l,
    )
    await writeLiveDataStore(store, projectRoot)

    await expect(
      aggregateLots(
        {
          sourceLotIds: ['lot-cherry-001', 'lot-green-001'],
          outputWeight: 100,
          outputForm: 'GREEN',
          actorId: 'user-processor-001',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'lot_quarantined' })
  })

  it('rejects processing when integrity is compromised', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    store.lots = store.lots.map((l) =>
      l.id === 'lot-cherry-001' ? { ...l, integrityStatus: 'COMPROMISED' as const } : l,
    )
    await writeLiveDataStore(store, projectRoot)

    await expect(
      processLot(
        {
          inputLotId: 'lot-cherry-001',
          inputWeight: 10,
          outputWeight: 10,
          outputForm: 'GREEN',
          byproducts: { pulp: 0, husk: 0, parchment: 0, defects: 0, moistureLoss: 0 },
          processingMethod: 'washed',
          actorId: 'user-processor-001',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'integrity_compromised' })
  })

  it('rejects dispatch for quarantined lot', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    store.lots = store.lots.map((l) =>
      l.id === 'lot-green-001'
        ? { ...l, status: 'QUARANTINED' as const, integrityStatus: 'COMPROMISED' as const }
        : l,
    )
    await writeLiveDataStore(store, projectRoot)

    await expect(
      recordDispatch(
        {
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          vehicleId: 'vehicle-001',
          driverId: 'driver-001',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'lot_quarantined' })
  })
})
