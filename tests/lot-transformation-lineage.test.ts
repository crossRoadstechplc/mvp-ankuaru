// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { validateLot } from '@/lib/lots/validate-lot'
import { aggregateLots, disaggregateLot } from '@/lib/lots/lot-transformation'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'
import { getChildLotIds, getParentLotIds, traceBackward, traceForward } from '@/lib/traceability/lineage-graph'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }

const farmerPick = async (projectRoot: string, weight: number, fieldId: string) => {
  const response = await createFarmerLot(
    withProjectRoot(
      projectRoot,
      {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          fieldId,
          weight,
        }),
      },
      farmerSession,
    ),
  )
  const data = (await response.json()) as { lot: { id: string } }
  return data.lot.id
}

const validateFarmerLot = async (projectRoot: string, lotId: string, observedWeight: number) => {
  await validateLot(
    {
      lotId,
      actorId: 'user-aggregator-001',
      decision: 'VALIDATED',
      observedWeight,
    },
    projectRoot,
  )
}

describe('lot transformation lineage graph', () => {
  it('updates backward and forward traces after aggregation', async () => {
    const projectRoot = await createTempProjectRoot()
    const lotA = await farmerPick(projectRoot, 120, 'field-001')
    const lotB = await farmerPick(projectRoot, 180, 'field-002')
    await validateFarmerLot(projectRoot, lotA, 120)
    await validateFarmerLot(projectRoot, lotB, 180)

    const { lot: out } = await aggregateLots(
      {
        sourceLotIds: [lotA, lotB],
        outputWeight: 300,
        outputForm: 'CHERRY',
        actorId: 'user-admin-001',
      },
      projectRoot,
    )

    const store = await readLiveDataStore(projectRoot)
    expect(getParentLotIds(out.id, store.events).sort()).toEqual([lotA, lotB].sort())
    expect(getChildLotIds(lotA, store.events)).toContain(out.id)
    expect(traceBackward(out.id, store.events).orderedLotIds).toContain(lotA)
    expect(traceForward(lotA, store.events).orderedLotIds).toContain(out.id)
  })

  it('updates traces after disaggregation', async () => {
    const projectRoot = await createTempProjectRoot()
    const sourceId = await farmerPick(projectRoot, 500, 'field-001')
    await validateFarmerLot(projectRoot, sourceId, 500)

    const { childLots } = await disaggregateLot(
      {
        sourceLotId: sourceId,
        outputs: [
          { weight: 200, form: 'GREEN' },
          { weight: 200, form: 'PARCHMENT' },
        ],
        actorId: 'user-processor-001',
      },
      projectRoot,
    )

    const store = await readLiveDataStore(projectRoot)
    const [c1, c2] = childLots.map((lot) => lot.id)

    expect(getParentLotIds(c1, store.events)).toEqual([sourceId])
    expect(getChildLotIds(sourceId, store.events).sort()).toEqual([c1, c2].sort())
    const forward = traceForward(sourceId, store.events).orderedLotIds
    expect(forward).toContain(sourceId)
    expect(forward).toContain(c1)
    expect(forward).toContain(c2)
  })
})
