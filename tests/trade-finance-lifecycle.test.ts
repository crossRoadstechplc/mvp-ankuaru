// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postDelivery } from '@/app/api/trade/delivery-confirm/route'
import { POST as postDefault } from '@/app/api/trade/default-sim/route'
import { POST as postLiquidate } from '@/app/api/trade/liquidate-sim/route'
import { POST as postMargin } from '@/app/api/trade/margin-evaluate/route'
import { POST as postSettlement } from '@/app/api/trade/settlement-sim/route'
import {
  liquidateTradeCollateral,
  marginMaintenanceFloor,
  simulateSettlement,
} from '@/lib/trade-lifecycle/finance-sim'
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

const deliverTrade001 = async (projectRoot: string) => {
  const res = await postDelivery(
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
  expect(res.status).toBe(200)
}

describe('settlement API', () => {
  it('completes settlement from DELIVERED with repay + SETTLED', async () => {
    const projectRoot = await createTempProjectRoot()
    await deliverTrade001(projectRoot)

    const res = await postSettlement(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          repayBank: true,
          completeSettlement: true,
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { trade: { status: string; bankRepaidSimulator?: boolean } }
    expect(body.trade.status).toBe('SETTLED')
    expect(body.trade.bankRepaidSimulator).toBe(true)

    const store = await readLiveDataStore(projectRoot)
    const t = store.trades.find((x) => x.id === 'trade-001')
    expect(t?.settlementCompletedAt).toBeDefined()
    const settledEv = store.events.filter((e) => e.type === 'SETTLEMENT_COMPLETED').at(-1)
    expect(settledEv?.metadata).toMatchObject({ tradeId: 'trade-001' })
  })

  it('rejects settlement when trade is not DELIVERED', async () => {
    const projectRoot = await createTempProjectRoot()

    const res = await postSettlement(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          completeSettlement: true,
        }),
      }),
    )
    expect(res.status).toBe(400)
  })
})

describe('margin call trigger', () => {
  it('sets MARGIN_CALL when simulated price index is below maintenance floor', async () => {
    const projectRoot = await createTempProjectRoot()
    const store0 = await readLiveDataStore(projectRoot)
    const trade = store0.trades.find((t) => t.id === 'trade-001')!
    const floor = marginMaintenanceFloor(trade)
    expect(floor).toBeCloseTo(0.82, 2)

    const res = await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: floor - 0.05,
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { marginCallTriggered: boolean; trade: { status: string } }
    expect(body.marginCallTriggered).toBe(true)
    expect(body.trade.status).toBe('MARGIN_CALL')

    const store = await readLiveDataStore(projectRoot)
    expect(store.trades.find((t) => t.id === 'trade-001')?.marginCallAt).toBeDefined()
    expect(store.events.filter((e) => e.type === 'MARGIN_CALL').length).toBeGreaterThan(0)
  })

  it('does not trigger duplicate MARGIN_CALL event when already in MARGIN_CALL', async () => {
    const projectRoot = await createTempProjectRoot()
    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.7,
        }),
      }),
    )
    const count1 = (await readLiveDataStore(projectRoot)).events.filter((e) => e.type === 'MARGIN_CALL').length

    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.65,
        }),
      }),
    )
    const count2 = (await readLiveDataStore(projectRoot)).events.filter((e) => e.type === 'MARGIN_CALL').length
    expect(count2).toBe(count1)
  })
})

describe('default and liquidation', () => {
  it('declares DEFAULTED from MARGIN_CALL', async () => {
    const projectRoot = await createTempProjectRoot()
    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.7,
        }),
      }),
    )

    const res = await postDefault(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          bankUserId: 'user-bank-001',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { trade: { status: string }; event: { type: string } }
    expect(body.trade.status).toBe('DEFAULTED')
    expect(body.event.type).toBe('TRADE_DEFAULTED')
  })

  it('liquidates collateral and clears lot collateral flags', async () => {
    const projectRoot = await createTempProjectRoot()
    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.7,
        }),
      }),
    )

    const res = await postLiquidate(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          bankUserId: 'user-bank-001',
        }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { trade: { status: string }; event: { type: string } }
    expect(body.trade.status).toBe('LIQUIDATED')
    expect(body.event.type).toBe('COLLATERAL_LIQUIDATED')

    const store = await readLiveDataStore(projectRoot)
    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot?.isCollateral).toBe(false)
    expect(lot?.collateralHolderId).toBeUndefined()
  })

  it('allows liquidation from DEFAULTED', async () => {
    const projectRoot = await createTempProjectRoot()
    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.7,
        }),
      }),
    )
    await postDefault(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({ tradeId: 'trade-001', bankUserId: 'user-bank-001' }),
      }),
    )

    const { trade } = await liquidateTradeCollateral(
      { tradeId: 'trade-001', bankUserId: 'user-bank-001' },
      projectRoot,
    )
    expect(trade.status).toBe('LIQUIDATED')
  })
})

describe('trade state transitions (lib)', () => {
  it('blocks settlement after margin call', async () => {
    const projectRoot = await createTempProjectRoot()
    await deliverTrade001(projectRoot)
    await postMargin(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          tradeId: 'trade-001',
          actorUserId: 'user-bank-001',
          simulatedPriceIndex: 0.7,
        }),
      }),
    )

    await expect(
      simulateSettlement(
        {
          tradeId: 'trade-001',
          actorUserId: 'user-importer-001',
          completeSettlement: true,
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'invalid_trade_status' })
  })
})
