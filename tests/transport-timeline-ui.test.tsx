import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { EventTimeline } from '@/components/events/event-timeline'

import type { Lot } from '@/lib/domain/types'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'
import type { DerivedLotState, LotTimelineEntry } from '@/lib/events/derived-state'

afterEach(() => {
  cleanup()
})

const baseLot: Lot = {
  id: 'lot-x',
  publicLotCode: 'ANK-X',
  internalUuid: 'u',
  traceKey: 't',
  form: 'GREEN',
  weight: 100,
  ownerId: 'user-exporter-001',
  ownerRole: 'exporter',
  custodianId: 'user-transporter-001',
  custodianRole: 'transporter',
  parentLotIds: [],
  childLotIds: [],
  status: 'IN_TRANSIT',
  labStatus: 'NOT_REQUIRED',
  isCollateral: false,
  integrityStatus: 'OK',
  validationStatus: 'VALIDATED',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const derived: DerivedLotState = {
  lotId: 'lot-x',
  eventCount: 2,
  totalInputQty: 0,
  totalOutputQty: 0,
  relatedEventIds: ['e1'],
}

describe('EventTimeline transport section', () => {
  it('shows insured badge and transport rows', () => {
    const transportTimeline: LotTimelineEntry[] = [
      {
        id: 'e-d',
        type: 'DISPATCH',
        timestamp: '2026-04-01T10:00:00.000Z',
        actorId: 'user-transporter-001',
        actorRole: 'transporter',
        inputLotIds: ['lot-x'],
        outputLotIds: ['lot-x'],
        direction: 'BOTH',
        metadata: { plateNumber: 'AA-1', driverName: 'D', insuredInTransit: true },
      },
    ]

    render(
      <EventTimeline
        lot={baseLot}
        derived={derived}
        timeline={transportTimeline}
        transportTimeline={transportTimeline}
        insuredInTransit
      />,
    )

    expect(screen.getByRole('heading', { name: /Dispatch & receipt/i })).toBeInTheDocument()
    expect(screen.getByText(/Insured in transit/i)).toBeInTheDocument()
    expect(screen.getByText(`DISPATCH · ${formatDisplayTimestamp('2026-04-01T10:00:00.000Z')}`)).toBeInTheDocument()
    expect(screen.getByText(/Vehicle: AA-1/)).toBeInTheDocument()
  })

  it('shows empty transport message when no events', () => {
    render(
      <EventTimeline
        lot={baseLot}
        derived={derived}
        timeline={[]}
        transportTimeline={[]}
        insuredInTransit={false}
      />,
    )

    expect(screen.getByText(/No dispatch or receipt events for this lot yet/)).toBeInTheDocument()
  })
})
