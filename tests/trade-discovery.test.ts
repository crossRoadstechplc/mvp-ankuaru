// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postBid } from '@/app/api/trade-discovery/bid/route'
import { POST as postRfq } from '@/app/api/trade-discovery/rfq/route'
import { POST as postSelect } from '@/app/api/trade-discovery/select-bid/route'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const exporterSession = { userId: 'user-exporter-001', role: 'exporter' as const }
const importerSession = { userId: 'user-importer-001', role: 'importer' as const }
const aggregatorSession = { userId: 'user-aggregator-001', role: 'aggregator' as const }
const farmerSession = { userId: 'user-farmer-001', role: 'farmer' as const }

describe('trade discovery API', () => {
  it('creates an RFQ as exporter', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-exporter-001',
            quantity: 500,
            qualityRequirement: 'SCA 84+',
            location: 'Addis',
            notes: 'Test',
          }),
        },
        exporterSession,
      ),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { rfq: { id: string; status: string } }
    expect(body.rfq.status).toBe('OPEN')
  })

  it('rejects RFQ from non-discovery roles', async () => {
    const projectRoot = await createTempProjectRoot()
    const agg = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-aggregator-001',
            quantity: 500,
            qualityRequirement: 'x',
            location: 'y',
          }),
        },
        aggregatorSession,
      ),
    )
    expect(agg.status).toBe(403)

    const farmer = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-farmer-001',
            quantity: 100,
            qualityRequirement: 'x',
            location: 'y',
          }),
        },
        farmerSession,
      ),
    )
    expect(farmer.status).toBe(403)
  })

  it('creates an RFQ as importer', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-importer-001',
            quantity: 250,
            qualityRequirement: 'SCA 85+',
            location: 'Djibouti',
          }),
        },
        importerSession,
      ),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { rfq: { status: string } }
    expect(body.rfq.status).toBe('OPEN')
  })

  it('creates a bid and links lots', async () => {
    const projectRoot = await createTempProjectRoot()
    const rfqRes = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-exporter-001',
            quantity: 500,
            qualityRequirement: 'SCA 84+',
            location: 'Addis',
          }),
        },
        exporterSession,
      ),
    )
    const { rfq } = (await rfqRes.json()) as { rfq: { id: string } }

    const bidRes = await postBid(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidderUserId: 'user-importer-001',
            price: 5.5,
            lotIds: ['lot-green-001'],
            notes: 'Ready',
          }),
        },
        importerSession,
      ),
    )
    expect(bidRes.status).toBe(201)
  })

  it('rejects bids from aggregator role', async () => {
    const projectRoot = await createTempProjectRoot()
    const rfqRes = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-exporter-001',
            quantity: 100,
            qualityRequirement: 'x',
            location: 'y',
          }),
        },
        exporterSession,
      ),
    )
    const { rfq } = (await rfqRes.json()) as { rfq: { id: string } }

    const bidRes = await postBid(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidderUserId: 'user-aggregator-001',
            price: 3,
            lotIds: ['lot-green-001'],
          }),
        },
        aggregatorSession,
      ),
    )
    expect(bidRes.status).toBe(403)
  })

  it('on winning bid selection creates trade with RFQ and bid links', async () => {
    const projectRoot = await createTempProjectRoot()
    const rfqRes = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-exporter-001',
            quantity: 500,
            qualityRequirement: 'SCA 84+',
            location: 'Addis',
          }),
        },
        exporterSession,
      ),
    )
    const { rfq } = (await rfqRes.json()) as { rfq: { id: string } }

    const bidRes = await postBid(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidderUserId: 'user-importer-001',
            price: 5.5,
            lotIds: ['lot-green-001'],
          }),
        },
        importerSession,
      ),
    )
    const { bid } = (await bidRes.json()) as { bid: { id: string } }

    const selRes = await postSelect(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidId: bid.id,
            rfqOwnerUserId: 'user-exporter-001',
          }),
        },
        exporterSession,
      ),
    )
    expect(selRes.status).toBe(201)
    const out = (await selRes.json()) as {
      trade: { rfqId: string; winningBidId: string; buyerUserId: string; sellerUserId: string }
      rfq: { status: string }
    }
    expect(out.rfq.status).toBe('CLOSED')
    expect(out.trade.rfqId).toBe(rfq.id)
    expect(out.trade.winningBidId).toBe(bid.id)
    expect(out.trade.buyerUserId).toBe('user-exporter-001')
    expect(out.trade.sellerUserId).toBe('user-importer-001')

    const store = await readLiveDataStore(projectRoot)
    expect(store.events.some((e) => e.type === 'BID_SELECTED')).toBe(true)
    expect(store.events.some((e) => e.type === 'TRADE_CREATED')).toBe(true)
  })

  it('rejects select when exporter user does not own the RFQ', async () => {
    const projectRoot = await createTempProjectRoot()
    const rfqRes = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-exporter-001',
            quantity: 100,
            qualityRequirement: 'x',
            location: 'y',
          }),
        },
        exporterSession,
      ),
    )
    const { rfq } = (await rfqRes.json()) as { rfq: { id: string } }
    const bidRes = await postBid(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidderUserId: 'user-importer-001',
            price: 2,
            lotIds: ['lot-green-001'],
          }),
        },
        importerSession,
      ),
    )
    const { bid } = (await bidRes.json()) as { bid: { id: string } }

    const bad = await postSelect(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidId: bid.id,
            rfqOwnerUserId: 'user-importer-001',
          }),
        },
        importerSession,
      ),
    )
    expect(bad.status).toBe(403)
  })

  it('when importer owns RFQ, selection uses importer as buyer and exporter bidder as seller', async () => {
    const projectRoot = await createTempProjectRoot()
    const rfqRes = await postRfq(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            createdByUserId: 'user-importer-001',
            quantity: 120,
            qualityRequirement: 'Grade 1',
            location: 'Port',
          }),
        },
        importerSession,
      ),
    )
    const { rfq } = (await rfqRes.json()) as { rfq: { id: string } }

    const bidRes = await postBid(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidderUserId: 'user-exporter-001',
            price: 4.25,
            lotIds: ['lot-green-001'],
          }),
        },
        exporterSession,
      ),
    )
    const { bid } = (await bidRes.json()) as { bid: { id: string } }

    const selRes = await postSelect(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            rfqId: rfq.id,
            bidId: bid.id,
            rfqOwnerUserId: 'user-importer-001',
          }),
        },
        importerSession,
      ),
    )
    expect(selRes.status).toBe(201)
    const out = (await selRes.json()) as { trade: { buyerUserId: string; sellerUserId: string } }
    expect(out.trade.buyerUserId).toBe('user-importer-001')
    expect(out.trade.sellerUserId).toBe('user-exporter-001')
  })
})
