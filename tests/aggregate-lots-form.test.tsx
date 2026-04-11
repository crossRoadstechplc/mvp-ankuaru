import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AggregateLotsForm } from '@/components/lots/aggregate-lots-form'

import type { Lot, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sampleLotsAggregatorCustody: Lot[] = [
  {
    id: 'lot-ag-a',
    publicLotCode: 'PLT-AGG-AAAA',
    internalUuid: 'u1',
    traceKey: 't1',
    form: 'CHERRY',
    weight: 100,
    ownerId: 'user-farmer-001',
    ownerRole: 'farmer',
    custodianId: 'user-aggregator-001',
    custodianRole: 'aggregator',
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
  {
    id: 'lot-ag-b',
    publicLotCode: 'PLT-AGG-BBBB',
    internalUuid: 'u2',
    traceKey: 't2',
    form: 'CHERRY',
    weight: 200,
    ownerId: 'user-farmer-001',
    ownerRole: 'farmer',
    custodianId: 'user-aggregator-001',
    custodianRole: 'aggregator',
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
  {
    id: 'lot-other',
    publicLotCode: 'PLT-OTHER',
    internalUuid: 'u3',
    traceKey: 't3',
    form: 'GREEN',
    weight: 50,
    ownerId: 'user-farmer-002',
    ownerRole: 'farmer',
    custodianId: 'user-farmer-002',
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

const sampleLots: Lot[] = [
  {
    id: 'lot-a',
    publicLotCode: 'PLT-AAAAAAAAAAAA',
    internalUuid: 'u1',
    traceKey: 't1',
    form: 'CHERRY',
    weight: 100,
    farmerId: 'user-farmer-001',
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
  {
    id: 'lot-b',
    publicLotCode: 'PLT-BBBBBBBBBBBB',
    internalUuid: 'u2',
    traceKey: 't2',
    form: 'CHERRY',
    weight: 200,
    farmerId: 'user-farmer-001',
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

const sampleLotsPendingRejected: Lot[] = [
  {
    id: 'lot-pend',
    publicLotCode: 'PLT-PEND',
    internalUuid: 'u-p',
    traceKey: 't-p',
    farmerId: 'user-farmer-001',
    ownerId: 'user-farmer-001',
    ownerRole: 'farmer',
    custodianId: 'user-farmer-001',
    custodianRole: 'farmer',
    form: 'CHERRY',
    weight: 50,
    parentLotIds: [],
    childLotIds: [],
    status: 'ACTIVE',
    labStatus: 'NOT_REQUIRED',
    isCollateral: false,
    integrityStatus: 'OK',
    validationStatus: 'PENDING',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'lot-rej',
    publicLotCode: 'PLT-REJ',
    internalUuid: 'u-r',
    traceKey: 't-r',
    farmerId: 'user-farmer-001',
    ownerId: 'user-farmer-001',
    ownerRole: 'farmer',
    custodianId: 'user-farmer-001',
    custodianRole: 'farmer',
    form: 'CHERRY',
    weight: 40,
    parentLotIds: [],
    childLotIds: [],
    status: 'ACTIVE',
    labStatus: 'NOT_REQUIRED',
    isCollateral: false,
    integrityStatus: 'OK',
    validationStatus: 'REJECTED',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

const sampleUsers: User[] = [
  {
    id: 'user-aggregator-001',
    name: 'Agg',
    email: 'a@test',
    role: 'aggregator',
    isActive: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

describe('AggregateLotsForm', () => {
  it('renders multi-select source lots and ledger fields', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleLots,
        })
      }
      if (url === '/api/users') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleUsers,
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AggregateLotsForm />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByText(/Source lots/i)).toBeInTheDocument()
    expect(screen.getByText(/PLT-AAAAAAAAAAAA/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Output weight/i)).toBeInTheDocument()
  })

  it('submits aggregation payload to the aggregate API', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleLots,
        })
      }
      if (url === '/api/users') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleUsers,
        })
      }
      if (url === '/api/lots/aggregate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ lot: { id: 'lot-new' }, event: { id: 'ev-1' } }),
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    const onSuccess = vi.fn()
    const { container } = render(<AggregateLotsForm onSuccess={onSuccess} />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const checkboxes = container.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThanOrEqual(2)
    fireEvent.click(checkboxes[0]!)
    fireEvent.click(checkboxes[1]!)

    fireEvent.change(screen.getByLabelText(/Output weight/i), { target: { value: '300' } })

    const form = container.querySelector('form')
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('lot-new'))

    const aggregateCall = fetchMock.mock.calls.find((call) => call[0] === '/api/lots/aggregate')
    expect(aggregateCall).toBeTruthy()
    const body = JSON.parse((aggregateCall![1] as { body: string }).body) as {
      sourceLotIds: string[]
      outputWeight: number
      actorId: string
    }
    expect(body.sourceLotIds).toContain('lot-a')
    expect(body.sourceLotIds).toContain('lot-b')
    expect(body.outputWeight).toBe(300)
    expect(body.actorId).toBe('user-aggregator-001')
  })

  it('with lockedActorId only lists lots that user owns or custodies', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleLotsAggregatorCustody,
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AggregateLotsForm lockedActorId="user-aggregator-001" />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByText(/PLT-AGG-AAAA/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-AGG-BBBB/)).toBeInTheDocument()
    expect(screen.queryByText(/PLT-OTHER/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Actor \(ledger\)/)).not.toBeInTheDocument()
  })

  it('when locked with farmer-origin mode, lists farmer-held cherry lots', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleLots,
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AggregateLotsForm lockedActorId="user-aggregator-001" includeFarmerOriginLots />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByText(/PLT-AAAAAAAAAAAA/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-BBBBBBBBBBBB/)).toBeInTheDocument()
  })

  it('does not list pending or rejected farmer lots when farmer-origin mode is on', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => [...sampleLotsPendingRejected, ...sampleLots],
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AggregateLotsForm lockedActorId="user-aggregator-001" includeFarmerOriginLots />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.queryByText(/PLT-PEND/)).not.toBeInTheDocument()
    expect(screen.queryByText(/PLT-REJ/)).not.toBeInTheDocument()
    expect(screen.getByText(/PLT-AAAAAAAAAAAA/)).toBeInTheDocument()
  })

  it('when locked without farmer-origin mode, hides farmer lots and shows hint', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/lots') {
        return Promise.resolve({
          ok: true,
          json: async () => sampleLots,
        })
      }
      return Promise.resolve({ ok: false, json: async () => ({}) })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AggregateLotsForm lockedActorId="user-aggregator-001" />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(screen.getByText(/No eligible lots found/)).toBeInTheDocument()
    expect(screen.getByText(/No lots you can select here/)).toBeInTheDocument()
    expect(screen.queryByText(/PLT-AAAAAAAAAAAA/)).not.toBeInTheDocument()
  })
})
