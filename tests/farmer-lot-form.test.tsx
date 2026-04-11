import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FarmerLotCreationForm } from '@/components/farmer/farmer-lot-creation-form'

import type { Field } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sampleFields: Field[] = [
  {
    id: 'field-a',
    farmerId: 'user-farmer-001',
    name: 'Plot A',
    polygon: [
      { lat: 1, lng: 2 },
      { lat: 3, lng: 2 },
      { lat: 2, lng: 4 },
    ],
    createdAt: '2026-04-01T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
  },
]

describe('FarmerLotCreationForm', () => {
  it('renders field selection and harvest metadata inputs', () => {
    render(
      <FarmerLotCreationForm farmerUserId="user-farmer-001" fields={sampleFields} />,
    )

    expect(screen.getByLabelText(/Field/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Pick quantity/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/e.g. 1250/i)).toBeInTheDocument()
    expect(screen.getByText(/Harvest metadata/i)).toBeInTheDocument()
  })

  it('submits create payload to the farmer lots API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ lot: { id: 'lot-new-1' }, event: { id: 'ev-1' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const onCreated = vi.fn()

    const { container } = render(
      <FarmerLotCreationForm
        farmerUserId="user-farmer-001"
        fields={sampleFields}
        onCreated={onCreated}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Pick quantity/i), { target: { value: '500' } })
    const form = container.querySelector('form')
    expect(form).toBeTruthy()
    fireEvent.submit(form!)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/farmer/lots',
      expect.objectContaining({
        method: 'POST',
      }),
    )

    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as {
      farmerId: string
      fieldId: string
      weight: number
    }
    expect(body.farmerId).toBe('user-farmer-001')
    expect(body.fieldId).toBe('field-a')
    expect(body.weight).toBe(500)
    expect(onCreated).toHaveBeenCalledWith('lot-new-1')
  })
})
