// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }

describe('POST /api/farmer/lots', () => {
  it('creates a lot and appends a PICK event with field linkage', async () => {
    const projectRoot = await createTempProjectRoot()

    const response = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 888,
            harvestMetadata: { variety: 'Test variety' },
          }),
        },
        farmerSession,
      ),
    )

    expect(response.status).toBe(201)
    const body = (await response.json()) as {
      lot: { id: string; fieldId: string; farmerId: string; publicLotCode: string; form: string }
      event: { id: string; type: string; outputLotIds: string[]; outputQty?: number }
    }

    expect(body.lot.fieldId).toBe('field-001')
    expect(body.lot.farmerId).toBe('user-farmer-001')
    expect(body.lot.form).toBe('CHERRY')
    expect((body.lot as { validationStatus?: string }).validationStatus).toBe('PENDING')
    expect(body.lot.publicLotCode).toMatch(/^PLT-[0-9A-F]{12}$/)

    expect(body.event.type).toBe('PICK')
    expect(body.event.outputLotIds).toContain(body.lot.id)
    expect(body.event.outputQty).toBe(888)

    const store = await readLiveDataStore(projectRoot)
    expect(store.lots.some((l) => l.id === body.lot.id)).toBe(true)
    expect(store.events.some((e) => e.id === body.event.id && e.type === 'PICK')).toBe(true)

    const pick = store.events.find((e) => e.id === body.event.id)
    expect(pick?.metadata && typeof pick.metadata === 'object' && 'fieldId' in pick.metadata).toBe(true)
  })

  it('rejects farmer id spoofing (body does not match session)', async () => {
    const projectRoot = await createTempProjectRoot()

    const response = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-aggregator-001',
            fieldId: 'field-001',
            weight: 100,
          }),
        },
        farmerSession,
      ),
    )

    expect(response.status).toBe(403)
    const err = (await response.json()) as { code?: string }
    expect(err.code).toBe('actor_mismatch')
  })

  it('produces distinct public lot codes for successive creates', async () => {
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
            weight: 200,
          }),
        },
        farmerSession,
      ),
    )

    const a = (await first.json()) as { lot: { publicLotCode: string } }
    const b = (await second.json()) as { lot: { publicLotCode: string } }
    expect(a.lot.publicLotCode).not.toBe(b.lot.publicLotCode)
  })
})
