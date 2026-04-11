// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postDelivery } from '@/app/api/trade/delivery-confirm/route'
import { confirmDelivery } from '@/lib/delivery/confirm-delivery'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const withProjectRoot = (projectRoot: string, init?: RequestInit) =>
  new Request('http://localhost', {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-ankuaru-project-root': projectRoot,
      ...(init?.headers ?? {}),
    },
  })

describe('delivery confirm API', () => {
  it('appends DELIVERY_CONFIRMED, sets trade DELIVERED, persists adjustment, updates lots', async () => {
    const projectRoot = await createTempProjectRoot()
    const storeBefore = await readLiveDataStore(projectRoot)
    const trade = storeBefore.trades.find((t) => t.id === 'trade-001')
    expect(trade?.status).toBe('IN_TRANSIT')

    const res = await postDelivery(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          deliveredWeightKg: 975.5,
          deliveredQualityOk: true,
          deliveryNotes: 'Arrived dry, good color.',
          adjustmentAmount: -120.5,
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      trade: { status: string; adjustmentAmount: number }
      event: { type: string }
    }
    expect(body.trade.status).toBe('DELIVERED')
    expect(body.trade.adjustmentAmount).toBe(-120.5)
    expect(body.event.type).toBe('DELIVERY_CONFIRMED')

    const store = await readLiveDataStore(projectRoot)
    const t = store.trades.find((tr) => tr.id === 'trade-001')
    expect(t?.deliveredWeightKg).toBe(975.5)
    expect(t?.deliveredQualityOk).toBe(true)
    expect(t?.deliveryNotes).toContain('Arrived dry')
    expect(t?.adjustmentAmount).toBe(-120.5)
    expect(t?.deliveryConfirmedAt).toBeDefined()

    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot?.status).toBe('DELIVERED')

    const ev = store.events.filter((e) => e.type === 'DELIVERY_CONFIRMED').at(-1)
    expect(ev?.metadata).toMatchObject({
      tradeId: 'trade-001',
      deliveredWeightKg: 975.5,
      adjustmentAmount: -120.5,
    })
  })

  it('returns 409 when delivery already confirmed', async () => {
    const projectRoot = await createTempProjectRoot()
    await postDelivery(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          deliveredWeightKg: 900,
          deliveredQualityOk: true,
        }),
      }),
    )

    const second = await postDelivery(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          deliveredWeightKg: 900,
          deliveredQualityOk: true,
        }),
      }),
    )
    expect(second.status).toBe(409)
  })

  it('returns 403 for farmer actor', async () => {
    const projectRoot = await createTempProjectRoot()

    const res = await postDelivery(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-farmer-001',
          deliveredWeightKg: 900,
          deliveredQualityOk: true,
        }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('allows exporter (seller) to confirm', async () => {
    const projectRoot = await createTempProjectRoot()

    const res = await postDelivery(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-exporter-001',
          deliveredWeightKg: 980,
          deliveredQualityOk: true,
        }),
      }),
    )
    expect(res.status).toBe(200)
  })
})

describe('delivery trade / lot status transitions', () => {
  it('allows admin to confirm on behalf', async () => {
    const projectRoot = await createTempProjectRoot()

    const { trade } = await confirmDelivery(
      {
        tradeId: 'trade-001',
        actorUserId: 'user-admin-001',
        deliveredWeightKg: 100,
        deliveredQualityOk: true,
      },
      projectRoot,
    )
    expect(trade.status).toBe('DELIVERED')
  })
})
