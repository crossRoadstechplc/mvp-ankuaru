import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}))

import { LabResultForm } from '@/components/labs/lab-result-form'

import type { Lot, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const lot: Pick<Lot, 'id' | 'publicLotCode' | 'labStatus' | 'status'> = {
  id: 'lot-1',
  publicLotCode: 'ANK-TEST',
  labStatus: 'PENDING',
  status: 'AT_LAB',
}

const labUsers: User[] = [
  {
    id: 'user-lab-001',
    name: 'Lab User',
    email: 'lab@test',
    role: 'lab',
    isActive: true,
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
]

describe('LabResultForm', () => {
  it('submits approval payload to the lab results API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<LabResultForm lot={lot} labUsers={labUsers} />)

    fireEvent.click(screen.getByRole('radio', { name: /Approved/i }))
    fireEvent.change(screen.getByPlaceholderText(/Defects, moisture/i), {
      target: { value: 'Clean cup' },
    })

    fireEvent.click(screen.getByRole('button', { name: /submit lab result/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/lab/results')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string) as {
      lotId: string
      labUserId: string
      status: string
      notes: string
    }
    expect(body.lotId).toBe('lot-1')
    expect(body.labUserId).toBe('user-lab-001')
    expect(body.status).toBe('APPROVED')
    expect(body.notes).toBe('Clean cup')
  })

  it('shows validation error for invalid metadata JSON', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<LabResultForm lot={lot} labUsers={labUsers} />)

    fireEvent.change(screen.getByPlaceholderText(/\{"moisturePercent"/i), {
      target: { value: 'not-json' },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit lab result/i }))

    expect(await screen.findByText(/valid JSON/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
