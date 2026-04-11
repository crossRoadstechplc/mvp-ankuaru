import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProcessLotsForm } from '@/components/lots/process-lots-form'

import type { Lot, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sampleLots: Lot[] = [
  {
    id: 'lot-in',
    publicLotCode: 'PLT-IN-IN-IN-IN-IN',
    internalUuid: 'u1',
    traceKey: 't1',
    form: 'CHERRY',
    weight: 300,
    ownerId: 'user-farmer-001',
    ownerRole: 'farmer',
    custodianId: 'user-farmer-001',
    custodianRole: 'farmer',
    parentLotIds: [],
    childLotIds: [],
    status: 'ACTIVE',
    labStatus: 'NOT_REQUIRED',
    isCollateral: false,
    integrityStatus: 'OK',
    validationStatus: 'VALIDATED',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

const sampleUsers: User[] = [
  {
    id: 'user-processor-001',
    name: 'Wash',
    email: 'w@test',
    role: 'processor',
    isActive: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

describe('ProcessLotsForm', () => {
  it('shows mass balance warning when totals do not match', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({ ok: true, json: async () => sampleLots })
      }
      if (url === '/api/users') {
        return Promise.resolve({ ok: true, json: async () => sampleUsers })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProcessLotsForm />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/Input lot/i), { target: { value: 'lot-in' } })
    fireEvent.change(screen.getByLabelText(/Input weight/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/Main output weight/i), { target: { value: '40' } })

    expect(await screen.findByText(/Adjust figures so input equals output/i)).toBeInTheDocument()
  })

  it('submits balanced payload to the process API', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({ ok: true, json: async () => sampleLots })
      }
      if (url === '/api/users') {
        return Promise.resolve({ ok: true, json: async () => sampleUsers })
      }
      if (url === '/api/lots/process') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            primaryLot: { id: 'lot-out' },
            event: { id: 'ev-1' },
          }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const onSuccess = vi.fn()
    const { container } = render(<ProcessLotsForm onSuccess={onSuccess} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/Input lot/i), { target: { value: 'lot-in' } })
    fireEvent.change(screen.getByLabelText(/Input weight/i), { target: { value: '100' } })
    fireEvent.change(screen.getByLabelText(/Main output weight/i), { target: { value: '70' } })

    const inputs = container.querySelectorAll('input[type="number"]')
    expect(inputs.length).toBeGreaterThanOrEqual(3)
    fireEvent.change(inputs[2]!, { target: { value: '30' } })

    const form = container.querySelector('form')
    fireEvent.submit(form!)

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    const processCall = fetchMock.mock.calls.find((call) => call[0] === '/api/lots/process')
    expect(processCall).toBeTruthy()
    const body = JSON.parse((processCall![1] as { body: string }).body) as {
      inputWeight: number
      outputWeight: number
      byproducts: { pulp: number }
    }
    expect(body.inputWeight).toBe(100)
    expect(body.outputWeight).toBe(70)
    expect(body.byproducts.pulp).toBe(30)
  })

  it('in processor mode only lists READY_FOR_PROCESSING lots', async () => {
    const readyLot: Lot = {
      ...sampleLots[0]!,
      id: 'lot-ready',
      publicLotCode: 'PLT-READY',
      status: 'READY_FOR_PROCESSING',
    }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({ ok: true, json: async () => [readyLot, sampleLots[0]!] })
      }
      if (url === '/api/users') {
        return Promise.resolve({ ok: true, json: async () => sampleUsers })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProcessLotsForm lockedActorId="user-processor-001" restrictToProcessReady />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const select = screen.getByLabelText(/Input lot/i) as HTMLSelectElement
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent ?? '')
    expect(options.some((t) => t.includes('PLT-READY'))).toBe(true)
    expect(options.some((t) => t.includes('PLT-IN-IN-IN-IN-IN'))).toBe(false)
  })
})
