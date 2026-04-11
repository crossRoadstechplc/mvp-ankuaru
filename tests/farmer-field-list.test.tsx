import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FarmerFieldList } from '@/components/farmer/farmer-field-list'

afterEach(() => {
  cleanup()
})

const baseField = {
  id: 'field-test-001',
  farmerId: 'user-farmer-001',
  name: 'Demo plot',
  polygon: [
    { lat: 6.1, lng: 38.1 },
    { lat: 6.2, lng: 38.1 },
    { lat: 6.15, lng: 38.2 },
  ],
  centroid: { lat: 6.15, lng: 38.15 },
  areaSqm: 4500,
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T08:00:00.000Z',
}

describe('FarmerFieldList', () => {
  it('renders summary cards and expandable polygon detail', () => {
    render(
      <FarmerFieldList
        fields={[baseField]}
        farmerDisplayName="Alemu Bekele"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('Demo plot')).toBeInTheDocument()
    expect(screen.getByText(/Farmer: Alemu Bekele/)).toBeInTheDocument()
    expect(screen.getByText('Vertices')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show detail' }))
    expect(screen.getByText(/Polygon coordinates/)).toBeInTheDocument()
  })

  it('calls onEdit and onDelete when action buttons are used', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(<FarmerFieldList fields={[baseField]} onEdit={onEdit} onDelete={onDelete} />)

    const edit = screen.getAllByRole('button', { name: /Edit field field-test-001/ })
    fireEvent.click(edit[edit.length - 1])
    expect(onEdit).toHaveBeenCalledWith(baseField)

    const del = screen.getAllByRole('button', { name: /Delete field field-test-001/ })
    fireEvent.click(del[del.length - 1])
    expect(onDelete).toHaveBeenCalledWith(baseField)
  })

  it('shows empty state when there are no fields', () => {
    render(<FarmerFieldList fields={[]} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/No fields yet/)).toBeInTheDocument()
  })
})
