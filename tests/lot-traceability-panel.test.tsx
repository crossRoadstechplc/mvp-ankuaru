import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LotTraceabilityPanel } from '@/components/lots/lot-traceability-panel'

describe('LotTraceabilityPanel', () => {
  it('renders trace sections and resolved lineage note when snapshot has no field', () => {
    render(
      <LotTraceabilityPanel
        lotId="lot-agg"
        publicLotCode="ANK-AGG-1"
        originResolved={{
          fieldId: 'field-001',
          fieldName: 'Test plot',
          farmerId: 'user-farmer-001',
          pathLotIds: ['lot-agg', 'lot-src'],
          resolvedViaLineage: true,
        }}
        directParentRefs={[{ id: 'lot-src', publicLotCode: 'ANK-SRC-1' }]}
        currentStage={{
          snapshotStatus: 'READY_FOR_PROCESSING',
          derivedHint: 'READY_FOR_PROCESSING',
          latestEventType: 'AGGREGATE',
        }}
        handoffs={[
          {
            id: 'e1',
            timestamp: '2026-01-01T00:00:00.000Z',
            type: 'AGGREGATE',
            actorRole: 'aggregator',
            actorId: 'user-aggregator-001',
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: /Origin, stage, and direct parents/i })).toBeInTheDocument()
    expect(screen.getByText(/no direct field link on the snapshot/i)).toBeInTheDocument()
    expect(screen.getByText('Test plot (field-001)')).toBeInTheDocument()
    expect(screen.getByText(/Direct parent lots/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ANK-SRC-1' })).toHaveAttribute('href', '/lots/lot-src')
    expect(screen.getByText(/Role & actor handoffs/i)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('AGGREGATE')).toBeInTheDocument()
  })
})
