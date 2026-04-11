import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DeliveryConfirmationForm } from '@/components/trade/delivery-confirmation-form'
import { DeliveryStatusBadges } from '@/components/trade/delivery-status-badges'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DeliveryStatusBadges', () => {
  it('shows pending when trade not yet delivered', () => {
    render(
      <DeliveryStatusBadges
        trade={{
          status: 'IN_TRANSIT',
          adjustmentAmount: undefined,
        }}
        showCommercialDetail
      />,
    )
    expect(screen.getByText(/delivery pending/i)).toBeInTheDocument()
  })

  it('shows delivered weight, quality, and adjustment when delivered', () => {
    render(
      <DeliveryStatusBadges
        trade={{
          status: 'DELIVERED',
          deliveredWeightKg: 950,
          deliveredQualityOk: true,
          deliveryConfirmedAt: '2026-04-10T12:00:00.000Z',
          adjustmentAmount: -50,
        }}
        showCommercialDetail
      />,
    )
    expect(screen.getByText(/delivered/i)).toBeInTheDocument()
    expect(screen.getByText(/950 kg/)).toBeInTheDocument()
    expect(screen.getByText(/quality accepted/i)).toBeInTheDocument()
    expect(screen.getByText(/-50/)).toBeInTheDocument()
  })

  it('hides commercial detail when showCommercialDetail is false', () => {
    render(
      <DeliveryStatusBadges
        trade={{
          status: 'DELIVERED',
          deliveredWeightKg: 950,
          deliveredQualityOk: true,
          deliveryConfirmedAt: '2026-04-10T12:00:00.000Z',
          adjustmentAmount: -50,
        }}
        showCommercialDetail={false}
      />,
    )
    expect(screen.queryByText(/950 kg/)).not.toBeInTheDocument()
  })
})

describe('DeliveryConfirmationForm', () => {
  it('submits delivery payload to API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ trade: {}, event: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { reload: vi.fn() })

    render(
      <DeliveryConfirmationForm
        tradeId="trade-x"
        actorOptions={[{ id: 'user-importer-001', label: 'Buyer' }]}
        defaultWeightKg={980}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Delivered weight/i), { target: { value: '975' } })
    fireEvent.change(screen.getByPlaceholderText(/Negative = rebate/i), { target: { value: '-25' } })

    fireEvent.submit(screen.getByRole('button', { name: /Record delivery/i }).closest('form')!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/trade/delivery-confirm') as [string, RequestInit]
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      tradeId: 'trade-x',
      actorUserId: 'user-importer-001',
      deliveredWeightKg: 975,
      deliveredQualityOk: true,
      adjustmentAmount: -25,
    })
  })
})
