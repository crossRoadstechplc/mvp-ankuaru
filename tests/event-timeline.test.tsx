import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventTimeline } from '@/components/events/event-timeline'
import { cloneSeedData } from '@/data/seed-data'
import { deriveLotStateFromEvents, getEventsForLot } from '@/lib/events/derived-state'
import { isInsuredInTransitDisplay } from '@/lib/transport/transport-state'

describe('event timeline and derived lot state', () => {
  it('derives useful lot status info from event history', () => {
    const store = cloneSeedData()
    const lot = store.lots.find((entry) => entry.id === 'lot-green-001')!

    const derived = deriveLotStateFromEvents(lot, [
      {
        id: 'event-a',
        type: 'DISPATCH',
        timestamp: '2026-04-01T00:00:00.000Z',
        actorId: 'user-transporter-001',
        actorRole: 'transporter',
        inputLotIds: ['lot-green-001'],
        outputLotIds: ['lot-green-001'],
        inputQty: 980,
        outputQty: 980,
      },
      {
        id: 'event-b',
        type: 'RECEIPT',
        timestamp: '2026-04-02T00:00:00.000Z',
        actorId: 'user-exporter-001',
        actorRole: 'exporter',
        inputLotIds: ['lot-green-001'],
        outputLotIds: ['lot-green-001'],
      },
    ])

    expect(derived.eventCount).toBe(2)
    expect(derived.latestEventType).toBe('RECEIPT')
    expect(derived.statusHint).toBe('DELIVERED')
    expect(derived.totalInputQty).toBe(980)
    expect(derived.relatedEventIds).toEqual(['event-a', 'event-b'])
  })

  it('renders the lot timeline with summary cards and expandable entries', () => {
    const store = cloneSeedData()
    const lot = store.lots.find((entry) => entry.id === 'lot-green-001')!
    const timeline = getEventsForLot(store.events, lot.id)
    const derived = deriveLotStateFromEvents(lot, store.events)
    const transportTimeline = timeline.filter(
      (entry) => entry.type === 'DISPATCH' || entry.type === 'RECEIPT',
    )

    render(
      <EventTimeline
        lot={lot}
        derived={derived}
        timeline={timeline}
        transportTimeline={transportTimeline}
        insuredInTransit={isInsuredInTransitDisplay(lot, store.events)}
      />,
    )

    expect(screen.getByRole('heading', { name: lot.publicLotCode })).toBeInTheDocument()
    expect(screen.getByText('Recorded events')).toBeInTheDocument()
    expect(screen.getByText('Summary first, details on demand')).toBeInTheDocument()
    expect(screen.getAllByText('BANK_APPROVED')).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Back to lots admin' })).toBeInTheDocument()
  })
})
