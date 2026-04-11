// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as aggregateLots } from '@/app/api/lots/aggregate/route'
import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { aggregateLots as aggregateLotsLib } from '@/lib/lots/lot-transformation'
import { validateLot } from '@/lib/lots/validate-lot'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { getChildLots, getParentLots } from '@/lib/traceability/lineage-graph'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }
const adminSession = { userId: 'user-admin-001', role: 'admin' as const }
const aggregatorSession = { userId: 'user-aggregator-001', role: 'aggregator' as const }

const validateFarmerLot = async (projectRoot: string, lotId: string, observedWeight: number, actorId: string) => {
  await validateLot(
    {
      lotId,
      actorId,
      decision: 'VALIDATED',
      observedWeight,
    },
    projectRoot,
  )
}

describe('POST /api/lots/aggregate', () => {
  it('creates an aggregated lot, AGGREGATE event, and lineage edges', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 100,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 250,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await validateFarmerLot(projectRoot, a.lot.id, 100, 'user-admin-001')
    await validateFarmerLot(projectRoot, b.lot.id, 250, 'user-admin-001')

    const response = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [a.lot.id, b.lot.id],
            outputWeight: 350,
            outputForm: 'DRIED_CHERRY',
            actorId: 'user-admin-001',
          }),
        },
        adminSession,
      ),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      lot: { id: string; parentLotIds: string[]; weight: number; form: string; status: string }
      event: { type: string; inputLotIds: string[]; outputLotIds: string[] }
    }

    expect(body.event.type).toBe('AGGREGATE')
    expect(body.event.inputLotIds.sort()).toEqual([a.lot.id, b.lot.id].sort())
    expect(body.event.outputLotIds).toEqual([body.lot.id])
    expect(body.lot.parentLotIds.sort()).toEqual([a.lot.id, b.lot.id].sort())
    expect(body.lot.form).toBe('DRIED_CHERRY')
    expect(body.lot.weight).toBe(350)
    expect(body.lot.status).toBe('READY_FOR_PROCESSING')

    const store = await readLiveDataStore(projectRoot)

    const parents = getParentLots(body.lot.id, store).map((lot) => lot.id).sort()
    expect(parents).toEqual([a.lot.id, b.lot.id].sort())

    expect(getChildLots(a.lot.id, store).some((lot) => lot.id === body.lot.id)).toBe(true)
    expect(getChildLots(b.lot.id, store).some((lot) => lot.id === body.lot.id)).toBe(true)

    const lotA = store.lots.find((lot) => lot.id === a.lot.id)
    const lotB = store.lots.find((lot) => lot.id === b.lot.id)
    expect(lotA?.childLotIds).toContain(body.lot.id)
    expect(lotB?.childLotIds).toContain(body.lot.id)
  })

  it('rejects when output weight exceeds combined source weight', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 50,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 50,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await validateFarmerLot(projectRoot, a.lot.id, 50, 'user-admin-001')
    await validateFarmerLot(projectRoot, b.lot.id, 50, 'user-admin-001')

    const response = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [a.lot.id, b.lot.id],
            outputWeight: 200,
            outputForm: 'CHERRY',
            actorId: 'user-admin-001',
          }),
        },
        adminSession,
      ),
    )

    expect(response.status).toBe(400)
  })

  it('allows aggregator on farmer-origin lots without prior custody transfer', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 40,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 60,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await validateFarmerLot(projectRoot, a.lot.id, 40, 'user-aggregator-001')
    await validateFarmerLot(projectRoot, b.lot.id, 60, 'user-aggregator-001')

    const response = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [a.lot.id, b.lot.id],
            outputWeight: 100,
            outputForm: 'CHERRY',
            actorId: 'user-aggregator-001',
          }),
        },
        aggregatorSession,
      ),
    )

    expect(response.status).toBe(201)
  })

  it('rejects aggregation when farmer lots are still pending validation', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 30,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 40,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await expect(
      aggregateLotsLib(
        {
          sourceLotIds: [a.lot.id, b.lot.id],
          outputWeight: 70,
          outputForm: 'CHERRY',
          actorId: 'user-admin-001',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'lot_not_validated' })
  })

  it('rejects aggregator when a source is not farmer-origin and not in their custody', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 40,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 60,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await validateFarmerLot(projectRoot, a.lot.id, 40, 'user-aggregator-001')
    await validateFarmerLot(projectRoot, b.lot.id, 60, 'user-aggregator-001')

    const store = await readLiveDataStore(projectRoot)
    store.lots = store.lots.map((lot) =>
      lot.id === b.lot.id
        ? {
            ...lot,
            farmerId: undefined,
            ownerId: 'user-exporter-001',
            ownerRole: 'exporter',
            custodianId: 'user-exporter-001',
            custodianRole: 'exporter',
          }
        : lot,
    )
    await writeLiveDataStore(store, projectRoot)

    const response = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [a.lot.id, b.lot.id],
            outputWeight: 100,
            outputForm: 'CHERRY',
            actorId: 'user-aggregator-001',
          }),
        },
        aggregatorSession,
      ),
    )

    expect(response.status).toBe(403)
    const err = (await response.json()) as { code?: string }
    expect(err.code).toBe('forbidden_lot_custody')
  })

  it('allows aggregator when they custody all source lots', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 55,
          }),
        },
        farmerSession,
      ),
    )
    const second = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-002',
            weight: 45,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { id: string } }
    const b = (await second.json()) as { lot: { id: string } }

    await validateFarmerLot(projectRoot, a.lot.id, 55, 'user-aggregator-001')
    await validateFarmerLot(projectRoot, b.lot.id, 45, 'user-aggregator-001')

    const store = await readLiveDataStore(projectRoot)
    store.lots = store.lots.map((lot) =>
      lot.id === a.lot.id || lot.id === b.lot.id
        ? { ...lot, custodianId: 'user-aggregator-001', custodianRole: 'aggregator' }
        : lot,
    )
    await writeLiveDataStore(store, projectRoot)

    const response = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [a.lot.id, b.lot.id],
            outputWeight: 100,
            outputForm: 'CHERRY',
            actorId: 'user-aggregator-001',
          }),
        },
        aggregatorSession,
      ),
    )

    expect(response.status).toBe(201)
  })
})
