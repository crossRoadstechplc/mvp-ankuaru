import type { Event, Lot } from '@/lib/domain/types'

/**
 * Movement events that affect custody. Used for lot-page transport section and insurance derivation.
 */
export const getTransportEventsForLot = (events: Event[], lotId: string): Event[] =>
  events
    .filter(
      (e) =>
        (e.type === 'DISPATCH' || e.type === 'RECEIPT') &&
        (e.inputLotIds.includes(lotId) || e.outputLotIds.includes(lotId)),
    )
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))

/**
 * While the lot snapshot is IN_TRANSIT and the latest transport event is DISPATCH with insurance flagged,
 * show as insured-in-transit (policy or coverage recorded at dispatch; cleared after receipt).
 */
export const isInsuredInTransitDisplay = (lot: Lot, events: Event[]): boolean => {
  if (lot.status !== 'IN_TRANSIT') {
    return false
  }
  const te = getTransportEventsForLot(events, lot.id)
  const last = te[te.length - 1]
  return last?.type === 'DISPATCH' && last.metadata?.insuredInTransit === true
}
