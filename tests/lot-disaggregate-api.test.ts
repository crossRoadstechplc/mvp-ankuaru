// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as disaggregateLot } from '@/app/api/lots/disaggregate/route'
import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'
import { getChildLots, getParentLots } from '@/lib/traceability/lineage-graph'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }
const processorSession = { userId: 'user-processor-001', role: 'processor' as const }

describe('POST /api/lots/disaggregate', () => {
  it('creates child lots, DISAGGREGATE event, and lineage edges', async () => {
    const projectRoot = await createTempProjectRoot()

    const pick = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 600,
          }),
        },
        farmerSession,
      ),
    )

    const { lot: source } = (await pick.json()) as { lot: { id: string; publicLotCode: string } }

    const response = await disaggregateLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotId: source.id,
            outputs: [
              { weight: 200, form: 'PARCHMENT' },
              { weight: 400, form: 'GREEN' },
            ],
            actorId: 'user-processor-001',
          }),
        },
        processorSession,
      ),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      childLots: Array<{ id: string; parentLotIds: string[]; weight: number; form: string }>
      event: { type: string; inputLotIds: string[]; outputLotIds: string[] }
      sourceLot: { id: string; childLotIds: string[] }
    }

    expect(body.event.type).toBe('DISAGGREGATE')
    expect(body.event.inputLotIds).toEqual([source.id])
    expect(body.event.outputLotIds.sort()).toEqual(body.childLots.map((lot) => lot.id).sort())

    expect(body.childLots).toHaveLength(2)
    for (const child of body.childLots) {
      expect(child.parentLotIds).toEqual([source.id])
    }

    const store = await readLiveDataStore(projectRoot)

    const children = getChildLots(source.id, store).map((lot) => lot.id).sort()
    expect(children).toEqual(body.childLots.map((lot) => lot.id).sort())

    for (const child of body.childLots) {
      expect(getParentLots(child.id, store).map((lot) => lot.id)).toEqual([source.id])
    }

    const refreshed = store.lots.find((lot) => lot.id === source.id)
    for (const child of body.childLots) {
      expect(refreshed?.childLotIds).toContain(child.id)
    }
  })

  it('rejects when child weights exceed source weight', async () => {
    const projectRoot = await createTempProjectRoot()

    const pick = await createFarmerLot(
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

    const { lot: source } = (await pick.json()) as { lot: { id: string } }

    const response = await disaggregateLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotId: source.id,
            outputs: [
              { weight: 80, form: 'CHERRY' },
              { weight: 80, form: 'CHERRY' },
            ],
            actorId: 'user-processor-001',
          }),
        },
        processorSession,
      ),
    )

    expect(response.status).toBe(400)
  })
})
