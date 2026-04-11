import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FarmerOriginLotsList } from '@/components/farmer/farmer-origin-lots-list'

import type { Field, Lot } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
})

const field: Field = {
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
}

const lot: Lot = {
  id: 'lot-x',
  publicLotCode: 'PLT-ABCDEF012345',
  internalUuid: '00000000-0000-4000-8000-000000000001',
  traceKey: 'TRK-ABCDEF0123',
  fieldId: 'field-a',
  farmerId: 'user-farmer-001',
  form: 'CHERRY',
  weight: 400,
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
  validationStatus: 'PENDING',
  createdAt: '2026-04-01T08:00:00.000Z',
  updatedAt: '2026-04-01T08:00:00.000Z',
}

describe('FarmerOriginLotsList', () => {
  it('renders lots for the farmer with public code and field name', () => {
    render(
      <FarmerOriginLotsList lots={[lot]} fields={[field]} farmerUserId="user-farmer-001" />,
    )

    expect(screen.getByText('PLT-ABCDEF012345')).toBeInTheDocument()
    expect(screen.getByText(/Plot A/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open lot detail/i })).toHaveAttribute('href', '/lots/lot-x')
  })

  it('shows empty copy when there are no matching lots', () => {
    render(<FarmerOriginLotsList lots={[]} fields={[field]} farmerUserId="user-farmer-001" />)
    expect(screen.getByText(/No lots yet/)).toBeInTheDocument()
  })

  it('lists all farmer-linked lots in all-farmers-origin mode with farmer id', () => {
    const lot2: Lot = {
      ...lot,
      id: 'lot-y',
      publicLotCode: 'PLT-SECOND000000',
      farmerId: 'user-farmer-002',
      weight: 120,
      updatedAt: '2026-04-02T08:00:00.000Z',
    }
    const older: Lot = {
      ...lot,
      id: 'lot-old',
      publicLotCode: 'PLT-OLDER0000000',
      updatedAt: '2026-03-01T08:00:00.000Z',
    }

    render(
      <FarmerOriginLotsList
        lots={[older, lot2]}
        fields={[field]}
        farmerUserId="user-farmer-001"
        listMode="all-farmers-origin"
      />,
    )

    expect(screen.getByText('user-farmer-002')).toBeInTheDocument()
    expect(screen.getByText('user-farmer-001')).toBeInTheDocument()
    expect(screen.getByText(/120 kg/)).toBeInTheDocument()
    expect(screen.getByText('PLT-SECOND000000')).toBeInTheDocument()
    expect(screen.getByText('PLT-OLDER0000000')).toBeInTheDocument()
  })

  it('shows distinct empty copy for all-farmers-origin when store has no farmer lots', () => {
    const noFarmer: Lot = { ...lot, farmerId: undefined }
    render(
      <FarmerOriginLotsList lots={[noFarmer]} fields={[field]} farmerUserId="user-farmer-001" listMode="all-farmers-origin" />,
    )
    expect(screen.getByText(/No farmer-linked origin lots/)).toBeInTheDocument()
  })
})
