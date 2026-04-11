// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { aggregateLots } from '@/lib/lots/lot-transformation'
import { processLot } from '@/lib/lots/processing-engine'
import { validateLot } from '@/lib/lots/validate-lot'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'
import { compareSnapshotLineageToEvents, resolveOriginFieldThroughLineage } from '@/lib/traceability/lineage-policy'
import { getParentLotIds, traceBackward, traceForward } from '@/lib/traceability/lineage-graph'

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

describe('R7 lineage integration: farmer → validate → aggregate → process → trace field', () => {
  it('resolves origin field through lineage for processed output without direct fieldId', async () => {
    const projectRoot = await createTempProjectRoot()
    const lotA = await farmerPick(projectRoot, 120, 'field-001')
    const lotB = await farmerPick(projectRoot, 180, 'field-002')
    await validateLot(
      { lotId: lotA, actorId: 'user-aggregator-001', decision: 'VALIDATED', observedWeight: 120 },
      projectRoot,
    )
    await validateLot(
      { lotId: lotB, actorId: 'user-aggregator-001', decision: 'VALIDATED', observedWeight: 180 },
      projectRoot,
    )

    const { lot: aggregated } = await aggregateLots(
      {
        sourceLotIds: [lotA, lotB],
        outputWeight: 300,
        outputForm: 'CHERRY',
        actorId: 'user-admin-001',
      },
      projectRoot,
    )

    const { primaryLot } = await processLot(
      {
        inputLotId: aggregated.id,
        inputWeight: 300,
        outputWeight: 300,
        outputForm: 'GREEN',
        byproducts: { pulp: 0, husk: 0, parchment: 0, defects: 0, moistureLoss: 0 },
        processingMethod: 'washed',
        actorId: 'user-processor-001',
      },
      projectRoot,
    )
    expect(primaryLot).not.toBeNull()

    const store = await readLiveDataStore(projectRoot)
    expect(compareSnapshotLineageToEvents(store.lots.find((l) => l.id === primaryLot!.id)!, store.events)).toBeNull()

    const origin = resolveOriginFieldThroughLineage(store, primaryLot!.id)
    expect(origin.fieldId).toBeDefined()
    expect(store.fields.some((f) => f.id === origin.fieldId)).toBe(true)

    expect(traceBackward(primaryLot!.id, store.events).orderedLotIds).toContain(lotA)
    expect(traceForward(lotA, store.events).orderedLotIds).toContain(aggregated.id)
    expect(getParentLotIds(primaryLot!.id, store.events)).toEqual([aggregated.id])
  })
})
