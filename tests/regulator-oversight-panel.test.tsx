import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { RegulatorOversightPanel } from '@/components/regulator/regulator-oversight-panel'

afterEach(() => {
  cleanup()
})

describe('RegulatorOversightPanel', () => {
  it('lists redacted trades without counterparties', () => {
    render(
      <RegulatorOversightPanel
        trades={[
          {
            id: 'trade-1',
            rfqId: 'rfq-1',
            buyerUserId: undefined,
            sellerUserId: undefined,
            lotIds: ['lot-a'],
            status: 'IN_TRANSIT',
            bankApproved: true,
            createdAt: '2026-01-01',
            updatedAt: '2026-01-01',
            commercialHidden: true,
            counterpartiesRedacted: true,
          },
        ]}
      />,
    )
    expect(screen.getByTestId('regulator-oversight-panel')).toBeInTheDocument()
    expect(screen.getByText('trade-1')).toBeInTheDocument()
    expect(screen.getByText(/Counterparties withheld/i)).toBeInTheDocument()
  })
})
