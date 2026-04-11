import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DispatchForm } from '@/components/transport/dispatch-form'
import { ReceiptForm } from '@/components/transport/receipt-form'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('DispatchForm', () => {
  it('submits dispatch payload with insurance flag', async () => {
    const lots = [
      {
        id: 'lot-1',
        publicLotCode: 'L1',
        status: 'ACTIVE',
        custodianRole: 'exporter',
        ownerId: 'o',
        ownerRole: 'exporter',
        custodianId: 'o',
        internalUuid: 'u',
        traceKey: 't',
        form: 'GREEN',
        weight: 1,
        parentLotIds: [],
        childLotIds: [],
        labStatus: 'NOT_REQUIRED',
        isCollateral: false,
        integrityStatus: 'OK',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]
    const users = [
      {
        id: 'user-transporter-001',
        name: 'T',
        role: 'transporter',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]
    const vehicles = [{ id: 'vehicle-001', plateNumber: 'AA-1', createdAt: '2026-01-01', updatedAt: '2026-01-01' }]
    const drivers = [{ id: 'driver-001', name: 'D', createdAt: '2026-01-01', updatedAt: '2026-01-01' }]

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') return Promise.resolve({ ok: true, json: async () => lots })
      if (url === '/api/users') return Promise.resolve({ ok: true, json: async () => users })
      if (url === '/api/vehicles') return Promise.resolve({ ok: true, json: async () => vehicles })
      if (url === '/api/drivers') return Promise.resolve({ ok: true, json: async () => drivers })
      if (url === '/api/transport/dispatch') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DispatchForm />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'lot-1' } })
    fireEvent.click(screen.getByLabelText(/Insured in transit/i))

    fireEvent.click(screen.getByRole('button', { name: /record dispatch/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/transport/dispatch',
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    const dispatchCall = fetchMock.mock.calls.find((c) => c[0] === '/api/transport/dispatch') as [
      string,
      RequestInit,
    ]
    expect(dispatchCall).toBeDefined()
    const body = JSON.parse(dispatchCall[1].body as string) as { insuredInTransit?: boolean }
    expect(body.insuredInTransit).toBe(true)
  })
})

describe('ReceiptForm', () => {
  it('submits receipt with next custodian role from selected user', async () => {
    const lots = [
      {
        id: 'lot-1',
        publicLotCode: 'L1',
        status: 'IN_TRANSIT',
        custodianRole: 'transporter',
        custodianId: 'user-transporter-001',
        ownerId: 'o',
        ownerRole: 'exporter',
        internalUuid: 'u',
        traceKey: 't',
        form: 'GREEN',
        weight: 1,
        parentLotIds: [],
        childLotIds: [],
        labStatus: 'NOT_REQUIRED',
        isCollateral: false,
        integrityStatus: 'OK',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]
    const users = [
      {
        id: 'user-transporter-001',
        name: 'T',
        role: 'transporter',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
      {
        id: 'user-exporter-001',
        name: 'E',
        role: 'exporter',
        isActive: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ]

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') return Promise.resolve({ ok: true, json: async () => lots })
      if (url === '/api/users') return Promise.resolve({ ok: true, json: async () => users })
      if (url === '/api/vehicles') return Promise.resolve({ ok: true, json: async () => [] })
      if (url === '/api/drivers') return Promise.resolve({ ok: true, json: async () => [] })
      if (url === '/api/transport/receipt') {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ReceiptForm />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'lot-1' } })
    fireEvent.click(screen.getByRole('button', { name: /record receipt/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/transport/receipt',
        expect.objectContaining({ method: 'POST' }),
      ),
    )

    const receiptCall = fetchMock.mock.calls.find((c) => c[0] === '/api/transport/receipt') as [
      string,
      RequestInit,
    ]
    const body = JSON.parse(receiptCall[1].body as string) as {
      nextCustodianRole: string
      lotId: string
    }
    expect(body.lotId).toBe('lot-1')
    expect(body.nextCustodianRole).toBe('exporter')
  })
})
