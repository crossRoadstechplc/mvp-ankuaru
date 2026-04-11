import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LotIntegrityBanner } from '@/components/integrity/lot-integrity-banner'
import type { Lot } from '@/lib/domain/types'

const baseLot: Lot = {
  id: 'lot-1',
  publicLotCode: 'ANK-1',
  internalUuid: 'u',
  traceKey: 't',
  form: 'GREEN',
  weight: 10,
  ownerId: 'o',
  ownerRole: 'farmer',
  custodianId: 'o',
  custodianRole: 'farmer',
  parentLotIds: [],
  childLotIds: [],
  status: 'ACTIVE',
  labStatus: 'NOT_REQUIRED',
  isCollateral: false,
  integrityStatus: 'OK',
  validationStatus: 'VALIDATED',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

afterEach(() => {
  cleanup()
})

describe('LotIntegrityBanner', () => {
  it('renders nothing when lot is clean', () => {
    const { container } = render(<LotIntegrityBanner lot={baseLot} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows compromised and quarantine badges and reason', () => {
    render(
      <LotIntegrityBanner
        lot={{
          ...baseLot,
          integrityStatus: 'COMPROMISED',
          status: 'QUARANTINED',
          quarantineReason: '[MASS_IMBALANCE] test detail',
        }}
      />,
    )
    expect(screen.getByTestId('lot-integrity-banner')).toBeInTheDocument()
    expect(screen.getByText('Compromised')).toBeInTheDocument()
    expect(screen.getByText('Quarantined')).toBeInTheDocument()
    expect(screen.getByText(/MASS_IMBALANCE/)).toBeInTheDocument()
  })
})
