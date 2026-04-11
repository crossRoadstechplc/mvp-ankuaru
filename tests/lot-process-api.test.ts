// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as processLotRoute } from '@/app/api/lots/process/route'
import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }
const processorSession = { userId: 'user-processor-001', role: 'processor' as const }
const adminSession = { userId: 'user-admin-001', role: 'admin' as const }

describe('POST /api/lots/process', () => {
  it('returns 201 when mass balances', async () => {
    const projectRoot = await createTempProjectRoot()
    const pick = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 400,
          }),
        },
        farmerSession,
      ),
    )
    const { lot: source } = (await pick.json()) as { lot: { id: string } }

    const storeReady = await readLiveDataStore(projectRoot)
    storeReady.lots = storeReady.lots.map((l) =>
      l.id === source.id ? { ...l, status: 'READY_FOR_PROCESSING' as const } : l,
    )
    await writeLiveDataStore(storeReady, projectRoot)

    const response = await processLotRoute(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            inputLotId: source.id,
            inputWeight: 200,
            outputWeight: 150,
            outputForm: 'PARCHMENT',
            processingMethod: 'natural',
            actorId: 'user-processor-001',
            byproducts: {
              pulp: 25,
              husk: 10,
              parchment: 5,
              defects: 5,
              moistureLoss: 5,
            },
          }),
        },
        processorSession,
      ),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      event: { type: string; inputQty: number }
      primaryLot: { id: string; form: string }
    }
    expect(body.event.type).toBe('PROCESS')
    expect(body.primaryLot.form).toBe('PARCHMENT')
  })

  it('returns 400 when mass does not balance', async () => {
    const projectRoot = await createTempProjectRoot()
    const pick = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 200,
          }),
        },
        farmerSession,
      ),
    )
    const { lot: source } = (await pick.json()) as { lot: { id: string } }

    const storeReady = await readLiveDataStore(projectRoot)
    storeReady.lots = storeReady.lots.map((l) =>
      l.id === source.id ? { ...l, status: 'READY_FOR_PROCESSING' as const } : l,
    )
    await writeLiveDataStore(storeReady, projectRoot)

    const response = await processLotRoute(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
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
          }),
        },
        processorSession,
      ),
    )

    expect(response.status).toBe(400)
    const err = (await response.json()) as { code: string }
    expect(err.code).toBe('mass_balance_violation')
  })

  it('rejects processor when input lot is not READY_FOR_PROCESSING', async () => {
    const projectRoot = await createTempProjectRoot()
    const pick = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 200,
          }),
        },
        farmerSession,
      ),
    )
    const { lot: source } = (await pick.json()) as { lot: { id: string } }

    const response = await processLotRoute(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            inputLotId: source.id,
            inputWeight: 100,
            outputWeight: 100,
            outputForm: 'GREEN',
            processingMethod: 'washed',
            actorId: 'user-processor-001',
            byproducts: { pulp: 0, husk: 0, parchment: 0, defects: 0, moistureLoss: 0 },
          }),
        },
        processorSession,
      ),
    )

    expect(response.status).toBe(400)
    const err = (await response.json()) as { code: string }
    expect(err.code).toBe('invalid_lot_status')
  })

  it('allows admin to process ACTIVE farmer lot without READY_FOR_PROCESSING', async () => {
    const projectRoot = await createTempProjectRoot()
    const pick = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 150,
          }),
        },
        farmerSession,
      ),
    )
    const { lot: source } = (await pick.json()) as { lot: { id: string } }

    const response = await processLotRoute(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            inputLotId: source.id,
            inputWeight: 100,
            outputWeight: 100,
            outputForm: 'GREEN',
            processingMethod: 'washed',
            actorId: 'user-admin-001',
            byproducts: { pulp: 0, husk: 0, parchment: 0, defects: 0, moistureLoss: 0 },
          }),
        },
        adminSession,
      ),
    )

    expect(response.status).toBe(201)
  })
})
