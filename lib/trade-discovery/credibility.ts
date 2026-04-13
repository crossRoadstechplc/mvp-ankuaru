import type { Event, LabResult, Lot, RFQ } from '@/lib/domain/types'

export type DiscoveryCredibility = {
  hasSourceLots: boolean
  processedLotsFound: number
  hasLabResult: boolean
  hasTransportLoop: boolean
  label: 'Credibility pending' | 'Lab verified' | 'Lab + transport verified'
}

const hasProcessEventForLot = (events: Event[], lotId: string): boolean =>
  events.some((event) => event.type === 'PROCESS' && event.outputLotIds.includes(lotId))

const hasDispatchAndReceiptForLot = (events: Event[], lotId: string): boolean => {
  const hasDispatch = events.some((event) => event.type === 'DISPATCH' && event.inputLotIds.includes(lotId))
  const hasReceipt = events.some((event) => event.type === 'RECEIPT' && event.inputLotIds.includes(lotId))
  return hasDispatch && hasReceipt
}

export const evaluateRfqCredibility = (
  rfq: RFQ,
  lots: Lot[],
  events: Event[],
  labResults: LabResult[],
): DiscoveryCredibility => {
  const sourceLotIds = rfq.sourceLotIds ?? []
  if (sourceLotIds.length === 0) {
    return {
      hasSourceLots: false,
      processedLotsFound: 0,
      hasLabResult: false,
      hasTransportLoop: false,
      label: 'Credibility pending',
    }
  }

  const sourceLots = sourceLotIds
    .map((id) => lots.find((lot) => lot.id === id))
    .filter((lot): lot is Lot => Boolean(lot))

  const processedLotsFound = sourceLots.filter((lot) => hasProcessEventForLot(events, lot.id)).length
  const hasLabResult = sourceLots.some((lot) => labResults.some((result) => result.lotId === lot.id))
  const hasTransportLoop = sourceLots.some((lot) => hasDispatchAndReceiptForLot(events, lot.id))

  if (hasLabResult && hasTransportLoop) {
    return {
      hasSourceLots: true,
      processedLotsFound,
      hasLabResult,
      hasTransportLoop,
      label: 'Lab + transport verified',
    }
  }
  if (hasLabResult) {
    return {
      hasSourceLots: true,
      processedLotsFound,
      hasLabResult,
      hasTransportLoop,
      label: 'Lab verified',
    }
  }
  return {
    hasSourceLots: true,
    processedLotsFound,
    hasLabResult,
    hasTransportLoop,
    label: 'Credibility pending',
  }
}
