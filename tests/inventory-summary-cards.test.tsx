import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { InventorySummaryCards } from '@/components/inventory/inventory-summary-cards'
import type { InventorySummary } from '@/lib/inventory/inventory-summary'

const mockSummary: InventorySummary = {
  lotsByStage: [
    { stage: 'ACTIVE', label: 'Active', lotCount: 2, totalWeightKg: 100 },
    { stage: 'CLOSED', label: 'Closed', lotCount: 1, totalWeightKg: 50 },
  ],
  lotsByForm: [
    { form: 'CHERRY', lotCount: 1, totalWeightKg: 60 },
    { form: 'GREEN', lotCount: 2, totalWeightKg: 90 },
  ],
  activeLotCount: 3,
  totalMainProductWeightKg: 200,
  totalByproductLotWeightKg: 20,
  processMass: {
    totalInputKg: 100,
    totalMainOutputKg: 70,
    totalByproductStreamKg: 30,
    residualKg: 0,
  },
  imbalanceWarnings: [],
  tradeStatusCounts: [{ status: 'OPEN', count: 1, label: 'Open' }],
}

describe('InventorySummaryCards', () => {
  it('renders metric cards with accessible structure', () => {
    render(<InventorySummaryCards summary={mockSummary} />)

    expect(screen.getByText('Inventory by stage')).toBeInTheDocument()
    expect(screen.getByText('Active lots')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Main product weight')).toBeInTheDocument()
    expect(screen.getByText('200.0 kg')).toBeInTheDocument()
    expect(screen.getByText('Byproduct totals')).toBeInTheDocument()
    expect(screen.getByText('20.0 kg')).toBeInTheDocument()
  })

  it('shows imbalance alert when warnings exist', () => {
    const withWarnings: InventorySummary = {
      ...mockSummary,
      imbalanceWarnings: ['PROCESS x: mismatch'],
    }
    render(<InventorySummaryCards summary={withWarnings} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/PROCESS x/)).toBeInTheDocument()
  })
})
