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
        pathLotRefs={[
          { id: 'lot-agg', publicLotCode: 'ANK-AGG-1' },
          { id: 'lot-src', publicLotCode: 'ANK-SRC-1' },
        ]}
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
        backwardTrace={[
          { id: 'lot-agg', publicLotCode: 'ANK-AGG-1' },
          { id: 'lot-src', publicLotCode: 'ANK-SRC-1' },
        ]}
        forwardTrace={[{ id: 'lot-agg', publicLotCode: 'ANK-AGG-1' }]}
      />,
    )

    expect(screen.getByRole('heading', { name: /Origin, stage, and ledger path/i })).toBeInTheDocument()
    expect(screen.getByText(/no direct field link on the snapshot/i)).toBeInTheDocument()
    expect(screen.getByText('Test plot (field-001)')).toBeInTheDocument()
    expect(screen.getByText(/Backward trace/i)).toBeInTheDocument()
    expect(screen.getByText(/Forward trace/i)).toBeInTheDocument()
    expect(screen.getByText(/Role & actor handoffs/i)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('AGGREGATE')).toBeInTheDocument()
  })
})
