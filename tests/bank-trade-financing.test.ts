// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postBankReview } from '@/app/api/bank/trade-review/route'
import { POST as postTrade } from '@/app/api/trades/route'
import { reviewTradeFinancing } from '@/lib/bank/review-trade-financing'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const bankSession = { userId: 'user-bank-001', role: 'bank' as const }
const exporterSession = { userId: 'user-exporter-001', role: 'exporter' as const }

const createPendingTrade = async (projectRoot: string) => {
  const res = await postTrade(
    withProjectRoot(projectRoot, {
      method: 'POST',
      body: JSON.stringify({
        rfqId: 'rfq-001',
        buyerUserId: 'user-importer-001',
        sellerUserId: 'user-exporter-001',
        lotIds: ['lot-green-001'],
        status: 'BANK_PENDING',
        bankApproved: false,
      }),
    }),
  )
  expect(res.status).toBe(201)
  const created = (await res.json()) as { id: string }
  return created.id
}

describe('bank trade financing API', () => {
  it('approves financing: sets bankApproved, margin, marginLocked, status, simulator flags, and collateral on lots', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const reviewRes = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
            marginPercent: 22.5,
            financingNotes: 'Tenor 90d; margin call at 15%',
            financedAmount: 50000,
          }),
        },
        bankSession,
      ),
    )
    expect(reviewRes.status).toBe(200)
    const body = (await reviewRes.json()) as { trade: { id: string }; lots: Array<{ id: string }> }
    expect(body.trade.id).toBe(tradeId)
    expect(body.lots.some((l) => l.id === 'lot-green-001')).toBe(true)

    const store = await readLiveDataStore(projectRoot)
    const trade = store.trades.find((t) => t.id === tradeId)
    expect(trade?.bankApproved).toBe(true)
    expect(trade?.marginLocked).toBe(true)
    expect(trade?.marginPercent).toBe(22.5)
    expect(trade?.status).toBe('BANK_APPROVED')
    expect(trade?.financingNotes).toContain('Tenor 90d')
    expect(trade?.financedAmount).toBe(50000)
    expect(trade?.simulationSellerPaidByBank).toBe(true)
    expect(trade?.simulationBuyerMarginOnlyUpfront).toBe(true)

    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot?.isCollateral).toBe(true)
    expect(lot?.collateralHolderId).toBe('user-bank-001')

    const approvedEvent = store.events.filter((e) => e.type === 'BANK_APPROVED').at(-1)
    expect(approvedEvent?.metadata).toMatchObject({
      tradeId,
      marginPercent: 22.5,
      marginLocked: true,
      simulationSellerPaidByBank: true,
      simulationBuyerMarginOnlyUpfront: true,
    })
  })

  it('rejects financing: clears lock, records notes, and moves BANK_PENDING trade back to DRAFT', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const reviewRes = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'reject',
            financingNotes: 'Covenant breach — simulator decline',
          }),
        },
        bankSession,
      ),
    )
    expect(reviewRes.status).toBe(200)

    const store = await readLiveDataStore(projectRoot)
    const trade = store.trades.find((t) => t.id === tradeId)
    expect(trade?.bankApproved).toBe(false)
    expect(trade?.marginLocked).toBe(false)
    expect(trade?.status).toBe('DRAFT')
    expect(trade?.financingNotes).toContain('Covenant breach')
  })

  it('returns 409 when financing was already decided (approve twice)', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const first = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
            marginPercent: 10,
          }),
        },
        bankSession,
      ),
    )
    expect(first.status).toBe(200)

    const second = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
            marginPercent: 12,
          }),
        },
        bankSession,
      ),
    )
    expect(second.status).toBe(409)
    const err = (await second.json()) as { code: string }
    expect(err.code).toBe('already_decided')
  })

  it('returns 403 when bankUserId is not a bank or admin', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const res = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-exporter-001',
            decision: 'approve',
            marginPercent: 15,
          }),
        },
        exporterSession,
      ),
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 when approving without valid marginPercent', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const res = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
          }),
        },
        bankSession,
      ),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when trade is not in a bank-reviewable status', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)
    const store = await readLiveDataStore(projectRoot)
    const idx = store.trades.findIndex((t) => t.id === tradeId)
    store.trades[idx] = { ...store.trades[idx], status: 'SETTLED' }
    await writeLiveDataStore(store, projectRoot)

    const res = await postBankReview(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            tradeId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
            marginPercent: 10,
          }),
        },
        bankSession,
      ),
    )
    expect(res.status).toBe(400)
    const err = (await res.json()) as { code: string }
    expect(err.code).toBe('invalid_trade_status')
  })
})

describe('reviewTradeFinancing state transitions', () => {
  it('transitions BANK_PENDING to BANK_APPROVED on approve', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const { trade } = await reviewTradeFinancing(
      {
        tradeId,
        bankUserId: 'user-bank-001',
        decision: 'approve',
        marginPercent: 20,
      },
      projectRoot,
    )

    expect(trade.status).toBe('BANK_APPROVED')
    expect(trade.bankApproved).toBe(true)
    expect(trade.marginLocked).toBe(true)
  })

  it('allows admin user to approve financing', async () => {
    const projectRoot = await createTempProjectRoot()
    const tradeId = await createPendingTrade(projectRoot)

    const { trade } = await reviewTradeFinancing(
      {
        tradeId,
        bankUserId: 'user-admin-001',
        decision: 'approve',
        marginPercent: 12,
      },
      projectRoot,
    )

    expect(trade.bankApproved).toBe(true)
    const store = await readLiveDataStore(projectRoot)
    const lot = store.lots.find((l) => l.id === 'lot-green-001')
    expect(lot?.collateralHolderId).toBe('user-admin-001')
  })
})
