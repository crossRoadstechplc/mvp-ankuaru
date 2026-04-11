import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InventoryChartsSection } from '@/components/inventory/inventory-charts'
import type { InventorySummary } from '@/lib/inventory/inventory-summary'

vi.mock('recharts', () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div data-testid="recharts-mock">{children}</div>
  return {
    ResponsiveContainer: Pass,
    BarChart: Pass,
    Bar: () => null,
    PieChart: Pass,
    Pie: () => null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  }
})

const mockSummary: InventorySummary = {
  lotsByStage: [{ stage: 'ACTIVE', label: 'Active', lotCount: 1, totalWeightKg: 10 }],
  lotsByForm: [{ form: 'CHERRY', lotCount: 1, totalWeightKg: 10 }],
  activeLotCount: 1,
  totalMainProductWeightKg: 10,
  totalByproductLotWeightKg: 0,
  processMass: {
    totalInputKg: 10,
    totalMainOutputKg: 8,
    totalByproductStreamKg: 2,
    residualKg: 0,
  },
  imbalanceWarnings: [],
  tradeStatusCounts: [{ status: 'OPEN', count: 2, label: 'Open' }],
}

afterEach(() => {
  cleanup()
})

describe('InventoryChartsSection', () => {
  it('renders chart section titles and expandable regions', () => {
    render(<InventoryChartsSection summary={mockSummary} />)

    expect(screen.getByRole('heading', { name: 'Charts' })).toBeInTheDocument()
    expect(screen.getByText('Weight by operational stage')).toBeInTheDocument()
    expect(screen.getByText('Lots by product form')).toBeInTheDocument()
    expect(screen.getByText('Main output vs byproduct streams vs residual')).toBeInTheDocument()
    expect(screen.getByText('Trades by status')).toBeInTheDocument()
  })

  it('renders chart containers for recharts content', () => {
    const { container } = render(<InventoryChartsSection summary={mockSummary} />)
    expect(container.querySelectorAll('[data-testid="recharts-mock"]').length).toBeGreaterThan(0)
  })
})
