// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postLabResult } from '@/app/api/lab/results/route'
import { POST as postTrade } from '@/app/api/trades/route'
import { PATCH as patchLot } from '@/app/api/lots/[id]/route'
import { submitLabResult } from '@/lib/labs/submit-lab-result'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const labSession = { userId: 'user-lab-001', role: 'lab' as const }

describe('submitLabResult domain', () => {
  it('approves AT_LAB lot to READY_FOR_EXPORT and records LAB_RESULT event', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING', status: 'AT_LAB' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    const out = await submitLabResult(
      {
        lotId: 'lot-green-001',
        labUserId: 'user-lab-001',
        status: 'APPROVED',
        score: 88,
        notes: 'OK',
      },
      projectRoot,
    )

    expect(out.lot.labStatus).toBe('APPROVED')
    expect(out.lot.status).toBe('READY_FOR_EXPORT')
    expect(out.event.type).toBe('LAB_RESULT')
    expect(out.event.metadata).toMatchObject({ labStatus: 'APPROVED' })

    const store = await readLiveDataStore(projectRoot)
    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot?.labStatus).toBe('APPROVED')
    expect(store.events.some((e) => e.id === out.event.id)).toBe(true)
  })

  it('fails AT_LAB lot to QUARANTINED when lab result is FAILED', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING', status: 'AT_LAB' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    const out = await submitLabResult(
      {
        lotId: 'lot-green-001',
        labUserId: 'user-lab-001',
        status: 'FAILED',
        notes: 'Moisture out of range',
      },
      projectRoot,
    )

    expect(out.lot.labStatus).toBe('FAILED')
    expect(out.lot.status).toBe('QUARANTINED')
  })

  it('rejects submission when lot does not require lab', async () => {
    const projectRoot = await createTempProjectRoot()
    await expect(
      submitLabResult(
        {
          lotId: 'lot-byproduct-001',
          labUserId: 'user-lab-001',
          status: 'APPROVED',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'lab_not_applicable' })
  })

  it('rejects non-lab actors', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING' }),
      }),
      { params: { id: 'lot-green-001' } },
    )
    await expect(
      submitLabResult(
        {
          lotId: 'lot-green-001',
          labUserId: 'user-farmer-001',
          status: 'APPROVED',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'forbidden_role' })
  })
})

describe('POST /api/lab/results', () => {
  it('returns 201 with lab result payload', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING', status: 'AT_LAB' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    const res = await postLabResult(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            lotId: 'lot-green-001',
            labUserId: 'user-lab-001',
            status: 'PENDING',
          }),
        },
        labSession,
      ),
    )

    expect(res.status).toBe(201)
    const body = (await res.json()) as { labResult: { id: string; status: string } }
    expect(body.labResult.status).toBe('PENDING')
  })
})

describe('trade creation lab gating', () => {
  it('blocks trades when a referenced lot is not lab-approved', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    const res = await postTrade(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: 'rfq-001',
          buyerUserId: 'user-importer-001',
          sellerUserId: 'user-exporter-001',
          lotIds: ['lot-green-001'],
          status: 'DRAFT',
          bankApproved: false,
        }),
      }),
    )

    expect(res.status).toBe(400)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('lab_export_blocked')
  })

  it('allows trades when lab is NOT_REQUIRED', async () => {
    const projectRoot = await createTempProjectRoot()

    const res = await postTrade(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: 'rfq-001',
          buyerUserId: 'user-importer-001',
          sellerUserId: 'user-exporter-001',
          lotIds: ['lot-byproduct-001'],
          status: 'DRAFT',
          bankApproved: false,
        }),
      }),
    )

    expect(res.status).toBe(201)
  })

  it('allows trades after lab approval', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING', status: 'AT_LAB' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    await submitLabResult(
      {
        lotId: 'lot-green-001',
        labUserId: 'user-lab-001',
        status: 'APPROVED',
      },
      projectRoot,
    )

    const res = await postTrade(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: 'rfq-001',
          buyerUserId: 'user-importer-001',
          sellerUserId: 'user-exporter-001',
          lotIds: ['lot-green-001'],
          status: 'DRAFT',
          bankApproved: false,
        }),
      }),
    )

    expect(res.status).toBe(201)
  })

  it('keeps failed lots off export-eligible trades', async () => {
    const projectRoot = await createTempProjectRoot()
    await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ labStatus: 'PENDING', status: 'AT_LAB' }),
      }),
      { params: { id: 'lot-green-001' } },
    )

    await submitLabResult(
      {
        lotId: 'lot-green-001',
        labUserId: 'user-lab-001',
        status: 'FAILED',
      },
      projectRoot,
    )

    const res = await postTrade(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          rfqId: 'rfq-001',
          buyerUserId: 'user-importer-001',
          sellerUserId: 'user-exporter-001',
          lotIds: ['lot-green-001'],
          status: 'DRAFT',
          bankApproved: false,
        }),
      }),
    )

    expect(res.status).toBe(400)
  })
})
