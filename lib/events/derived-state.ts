import type { Event, LiveDataStore, Lot, LotStatus } from '@/lib/domain/types'

export type LotTimelineEntry = Event & {
  direction: 'INPUT' | 'OUTPUT' | 'BOTH'
}

export type DerivedLotState = {
  lotId: string
  eventCount: number
  firstSeenAt?: string
  lastSeenAt?: string
  latestEventType?: Event['type']
  latestActorId?: string
  latestActorRole?: Event['actorRole']
  totalInputQty: number
  totalOutputQty: number
  relatedEventIds: string[]
  statusHint?: LotStatus
}

const STATUS_HINT_BY_EVENT: Partial<Record<Event['type'], LotStatus>> = {
  PICK: 'ACTIVE',
  AGGREGATE: 'READY_FOR_PROCESSING',
  DISAGGREGATE: 'IN_PROCESSING',
  PROCESS: 'IN_PROCESSING',
  DISPATCH: 'IN_TRANSIT',
  RECEIPT: 'DELIVERED',
  HANDOVER_TO_LAB: 'AT_LAB',
  LAB_RESULT: 'AT_LAB',
  BANK_APPROVED: 'READY_FOR_EXPORT',
  DELIVERY_CONFIRMED: 'DELIVERED',
}

export const getEventsForLot = (events: Event[], lotId: string): LotTimelineEntry[] =>
  events
    .filter((event) => event.inputLotIds.includes(lotId) || event.outputLotIds.includes(lotId))
    .map((event): LotTimelineEntry => {
      const direction: LotTimelineEntry['direction'] =
        event.inputLotIds.includes(lotId) && event.outputLotIds.includes(lotId)
          ? 'BOTH'
          : event.outputLotIds.includes(lotId)
            ? 'OUTPUT'
            : 'INPUT'

      return {
        ...event,
        direction,
      }
    })
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp))

export const deriveLotStateFromEvents = (lot: Lot, events: Event[]): DerivedLotState => {
  const timeline = getEventsForLot(events, lot.id)
  const latestEvent = timeline.at(-1)

  return {
    lotId: lot.id,
    eventCount: timeline.length,
    firstSeenAt: timeline[0]?.timestamp,
    lastSeenAt: latestEvent?.timestamp,
    latestEventType: latestEvent?.type,
    latestActorId: latestEvent?.actorId,
    latestActorRole: latestEvent?.actorRole,
    totalInputQty: timeline.reduce((sum, event) => sum + (event.inputQty ?? 0), 0),
    totalOutputQty: timeline.reduce((sum, event) => sum + (event.outputQty ?? 0), 0),
    relatedEventIds: timeline.map((event) => event.id),
    statusHint: latestEvent ? STATUS_HINT_BY_EVENT[latestEvent.type] ?? lot.status : undefined,
  }
}

export const getLotWithDerivedState = (store: LiveDataStore, lotId: string) => {
  const lot = store.lots.find((entry) => entry.id === lotId)
  if (!lot) {
    return undefined
  }

  const timeline = getEventsForLot(store.events, lotId)
  const derived = deriveLotStateFromEvents(lot, store.events)

  return {
    lot,
    timeline,
    derived,
  }
}
