import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DisaggregateLotForm } from '@/components/lots/disaggregate-lot-form'

import type { Lot, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sampleLots: Lot[] = [
  {
    id: 'lot-src',
    publicLotCode: 'PLT-SRC-SRC-SRC-SRC',
    internalUuid: 'u1',
    traceKey: 't1',
    form: 'CHERRY',
    weight: 500,
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
    name: 'Proc',
    email: 'p@test',
    role: 'processor',
    isActive: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

describe('DisaggregateLotForm', () => {
  it('renders source selector and child rows', async () => {
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

    render(<DisaggregateLotForm />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByLabelText(/Source lot/i)).toBeInTheDocument()
    expect(screen.getByText(/Child lots \(two or more\)/i)).toBeInTheDocument()
  })

  it('submits disaggregation payload to the disaggregate API', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({ ok: true, json: async () => sampleLots })
      }
      if (url === '/api/users') {
        return Promise.resolve({ ok: true, json: async () => sampleUsers })
      }
      if (url === '/api/lots/disaggregate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sourceLot: { id: 'lot-src' },
            childLots: [{ id: 'c1' }, { id: 'c2' }],
            event: { id: 'ev-1' },
          }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const onSuccess = vi.fn()
    const { container } = render(<DisaggregateLotForm onSuccess={onSuccess} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText(/Source lot/i), { target: { value: 'lot-src' } })

    const weightInputs = container.querySelectorAll('input[type="number"]')
    expect(weightInputs.length).toBeGreaterThanOrEqual(2)
    fireEvent.change(weightInputs[0]!, { target: { value: '200' } })
    fireEvent.change(weightInputs[1]!, { target: { value: '300' } })

    const form = container.querySelector('form')
    fireEvent.submit(form!)

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())

    const disCall = fetchMock.mock.calls.find((call) => call[0] === '/api/lots/disaggregate')
    expect(disCall).toBeTruthy()
    const body = JSON.parse((disCall![1] as { body: string }).body) as {
      sourceLotId: string
      outputs: { weight: number }[]
      actorId: string
    }
    expect(body.sourceLotId).toBe('lot-src')
    expect(body.outputs.map((o) => o.weight)).toEqual([200, 300])
    expect(body.actorId).toBe('user-processor-001')
  })
})
