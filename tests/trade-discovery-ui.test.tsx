import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CreateRfqForm } from '@/components/trade/create-rfq-form'
import { SubmitBidForm } from '@/components/trade/submit-bid-form'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const exporters = [
  {
    id: 'user-exporter-001',
    name: 'Exp',
    role: 'exporter' as const,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

describe('CreateRfqForm', () => {
  it('posts RFQ payload to trade-discovery API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rfq: { id: 'rfq-new' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CreateRfqForm publisherUsers={exporters} />)

    fireEvent.change(screen.getByLabelText(/Desired quantity/i), { target: { value: '400' } })
    fireEvent.change(screen.getByLabelText(/Quality requirement/i), {
      target: { value: 'Washed 84+' },
    })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Port' } })

    fireEvent.click(screen.getByRole('button', { name: /Publish RFQ/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trade-discovery/rfq',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/trade-discovery/rfq') as [string, RequestInit]
    const body = JSON.parse(call[1].body as string) as { quantity: number; createdByUserId: string }
    expect(body.quantity).toBe(400)
    expect(body.createdByUserId).toBe('user-exporter-001')
  })
})

const bidders = [
  {
    id: 'user-importer-001',
    name: 'Imp',
    role: 'importer' as const,
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

const lots = [
  {
    id: 'lot-green-001',
    publicLotCode: 'G1',
    status: 'READY_FOR_EXPORT' as const,
    form: 'GREEN' as const,
    weight: 100,
    ownerId: 'x',
    ownerRole: 'exporter' as const,
    custodianId: 'x',
    custodianRole: 'exporter' as const,
    internalUuid: 'u',
    traceKey: 't',
    parentLotIds: [],
    childLotIds: [],
    labStatus: 'APPROVED' as const,
    isCollateral: false,
    integrityStatus: 'OK' as const,
    validationStatus: 'VALIDATED' as const,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

describe('SubmitBidForm', () => {
  it('submits bid with price and lot ids', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bid: { id: 'bid-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<SubmitBidForm rfqId="rfq-abc" bidderUsers={bidders} lots={lots} />)

    fireEvent.change(screen.getByLabelText(/Unit price/i), { target: { value: '5.4' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /G1/ }))

    fireEvent.click(screen.getByRole('button', { name: /Submit bid/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/trade-discovery/bid',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/trade-discovery/bid') as [string, RequestInit]
    const body = JSON.parse(call[1].body as string) as {
      rfqId: string
      bidderUserId: string
      price: number
      lotIds: string[]
    }
    expect(body.rfqId).toBe('rfq-abc')
    expect(body.bidderUserId).toBe('user-importer-001')
    expect(body.price).toBe(5.4)
    expect(body.lotIds).toContain('lot-green-001')
  })
})
