// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { validateLot } from '@/lib/lots/validate-lot'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }

describe('validateLot', () => {
  it('appends VALIDATE_LOT and sets lot to VALIDATED with observed weight', async () => {
    const projectRoot = await createTempProjectRoot()

    const created = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 120,
          }),
        },
        farmerSession,
      ),
    )
    const { lot: createdLot } = (await created.json()) as { lot: { id: string; validationStatus: string } }
    expect(createdLot.validationStatus).toBe('PENDING')

    const { lot, event } = await validateLot(
      {
        lotId: createdLot.id,
        actorId: 'user-aggregator-001',
        decision: 'VALIDATED',
        observedWeight: 118.5,
        validationNotes: 'OK for coop',
      },
      projectRoot,
    )

    expect(lot.validationStatus).toBe('VALIDATED')
    expect(lot.weight).toBe(118.5)
    expect(lot.observedWeight).toBe(118.5)
    expect(lot.validatedByUserId).toBe('user-aggregator-001')
    expect(event.type).toBe('VALIDATE_LOT')
    expect(event.metadata && typeof event.metadata === 'object' && 'decision' in event.metadata).toBe(true)

    const store = await readLiveDataStore(projectRoot)
    expect(store.events.some((e) => e.id === event.id && e.type === 'VALIDATE_LOT')).toBe(true)
  })

  it('rejects with REJECTED and keeps declared weight', async () => {
    const projectRoot = await createTempProjectRoot()

    const created = await createFarmerLot(
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
    const { lot: createdLot } = (await created.json()) as { lot: { id: string } }

    const { lot } = await validateLot(
      {
        lotId: createdLot.id,
        actorId: 'user-aggregator-001',
        decision: 'REJECTED',
        observedWeight: 195,
        validationNotes: 'Out of spec',
      },
      projectRoot,
    )

    expect(lot.validationStatus).toBe('REJECTED')
    expect(lot.weight).toBe(200)
    expect(lot.observedWeight).toBe(195)
  })
})
