// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postOnboarding } from '@/app/api/bank/onboarding-review/route'
import { POST as createFarmerLot } from '@/app/api/farmer/lots/route'
import { POST as aggregateLots } from '@/app/api/lots/aggregate/route'
import { POST as postRfq } from '@/app/api/trade-discovery/rfq/route'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

describe('mock API session guards', () => {
  it('returns 401 when session headers are missing for protected routes', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await createFarmerLot(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          fieldId: 'field-001',
          weight: 10,
        }),
      }),
    )
    expect(res.status).toBe(401)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('auth_required')
  })

  it('rejects farmer lot when session role is not farmer', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await createFarmerLot(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            farmerId: 'user-farmer-001',
            fieldId: 'field-001',
            weight: 10,
          }),
        },
        { userId: 'user-aggregator-001', role: 'aggregator' },
      ),
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('forbidden_role')
  })

  it('rejects aggregation when actor id in body does not match session (non-admin)', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: ['lot-a', 'lot-b'],
            outputWeight: 1,
            outputForm: 'CHERRY',
            actorId: 'user-admin-001',
          }),
        },
        { userId: 'user-aggregator-001', role: 'aggregator' },
      ),
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('actor_mismatch')
  })

  it('allows admin to supply a different actor id for aggregation', async () => {
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
        { userId: 'user-farmer-001', role: 'farmer' },
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
        { userId: 'user-farmer-001', role: 'farmer' },
      ),
    )
    const la = (await first.json()) as { lot: { id: string } }
    const lb = (await second.json()) as { lot: { id: string } }

    const { validateLot } = await import('@/lib/lots/validate-lot')
    await validateLot(
      {
        lotId: la.lot.id,
        actorId: 'user-admin-001',
        decision: 'VALIDATED',
        observedWeight: 30,
      },
      projectRoot,
    )
    await validateLot(
      {
        lotId: lb.lot.id,
        actorId: 'user-admin-001',
        decision: 'VALIDATED',
        observedWeight: 40,
      },
      projectRoot,
    )

    const agg = await aggregateLots(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            sourceLotIds: [la.lot.id, lb.lot.id],
            outputWeight: 70,
            outputForm: 'CHERRY',
            actorId: 'user-aggregator-001',
          }),
        },
        { userId: 'user-admin-001', role: 'admin' },
      ),
    )
    expect(agg.status).toBe(201)
  })

  it('rejects RFQ when session user does not match createdByUserId in body', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-importer-001',
            quantity: 10,
            qualityRequirement: 'x',
            location: 'y',
          }),
        },
        { userId: 'user-exporter-001', role: 'exporter' },
      ),
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('actor_mismatch')
  })

  it('rejects bank onboarding when bankUserId does not match session', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await postOnboarding(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            reviewId: 'bank-review-001',
            bankUserId: 'user-bank-001',
            decision: 'approve',
          }),
        },
        { userId: 'user-exporter-001', role: 'exporter' },
      ),
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('actor_mismatch')
  })
})
