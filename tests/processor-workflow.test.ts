// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as aggregateLots } from '@/app/api/lots/aggregate/route'
import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { processLot } from '@/lib/lots/processing-engine'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'
import { validateLot } from '@/lib/lots/validate-lot'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }
const aggregatorSession = { userId: 'user-aggregator-001', role: 'aggregator' as const }

const validateFarmer = async (projectRoot: string, lotId: string, w: number) => {
  await validateLot(
    { lotId, actorId: 'user-aggregator-001', decision: 'VALIDATED', observedWeight: w },
    projectRoot,
  )
}

describe('processor pipeline after aggregation', () => {
  it('aggregated lot is READY_FOR_PROCESSING and visible to processor process API', async () => {
    const projectRoot = await createTempProjectRoot()

    const a = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({ farmerId: 'user-farmer-001', fieldId: 'field-001', weight: 80 }),
        },
        farmerSession,
      ),
    )
    const b = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({ farmerId: 'user-farmer-001', fieldId: 'field-002', weight: 120 }),
        },
        farmerSession,
      ),
    )
    const la = (await a.json()) as { lot: { id: string } }
    const lb = (await b.json()) as { lot: { id: string } }
    await validateFarmer(projectRoot, la.lot.id, 80)
    await validateFarmer(projectRoot, lb.lot.id, 120)

    const agg = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [la.lot.id, lb.lot.id],
            outputWeight: 200,
            outputForm: 'CHERRY',
            actorId: 'user-aggregator-001',
          }),
        },
        aggregatorSession,
      ),
    )
    expect(agg.status).toBe(201)
    const body = (await agg.json()) as { lot: { id: string; status: string } }
    expect(body.lot.status).toBe('READY_FOR_PROCESSING')

    const store = await readLiveDataStore(projectRoot)
    const aggregated = store.lots.find((l) => l.id === body.lot.id)
    expect(aggregated?.status).toBe('READY_FOR_PROCESSING')

    const result = await processLot(
      {
        inputLotId: body.lot.id,
        inputWeight: 200,
        outputWeight: 180,
        outputForm: 'GREEN',
        processingMethod: 'washed',
        actorId: 'user-processor-001',
        byproducts: { pulp: 10, husk: 5, parchment: 0, defects: 3, moistureLoss: 2 },
      },
      projectRoot,
    )

    expect(result.event.type).toBe('PROCESS')
    expect(result.primaryLot?.form).toBe('GREEN')
  })
})
