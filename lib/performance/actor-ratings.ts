import type { Event, LiveDataStore, Lot, User } from '@/lib/domain/types'
import { isMassBalanced, sumLedgerByproductsKg } from '@/lib/lots/processing-mass-balance'

/** 0–100 scores from simulated timeliness, ledger accuracy, and quality signals. */
export type ActorPerformanceBreakdown = {
  userId: string
  timelinessScore: number
  accuracyScore: number
  qualityAdherenceScore: number
  compositeScore: number
}

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

const toMasses = (event: Event) => ({
  pulp: event.byproducts?.pulp ?? 0,
  husk: event.byproducts?.husk ?? 0,
  parchment: event.byproducts?.parchment ?? 0,
  defects: event.byproducts?.defects ?? 0,
  moistureLoss: event.byproducts?.moistureLoss ?? 0,
})

const dayMs = 24 * 60 * 60 * 1000

const parseTs = (iso: string): number => new Date(iso).getTime()

/**
 * Simulated SLA gaps (days) that still score well if under the soft target.
 */
const SOFT_DAYS = {
  pickToProcess: 5,
  handoverToLabResult: 4,
  bidToBankApproval: 3,
} as const

const timelinessForUser = (userId: string, events: Event[]): number => {
  const scores: number[] = []

  const byLot = new Map<string, Event[]>()
  for (const e of events) {
    for (const id of [...e.inputLotIds, ...e.outputLotIds]) {
      if (!byLot.has(id)) {
        byLot.set(id, [])
      }
      byLot.get(id)!.push(e)
    }
  }

  for (const [, list] of byLot) {
    const sorted = [...list].sort((a, b) => parseTs(a.timestamp) - parseTs(b.timestamp))
    let pick: Event | undefined
    let processEv: Event | undefined
    let handover: Event | undefined
    let labResult: Event | undefined
    for (const e of sorted) {
      if (e.type === 'PICK' && e.actorId === userId) {
        pick = e
      }
      if (e.type === 'PROCESS' && e.actorId === userId) {
        processEv = e
      }
      if (e.type === 'HANDOVER_TO_LAB' && e.actorId === userId) {
        handover = e
      }
      if (e.type === 'LAB_RESULT' && e.actorId === userId) {
        labResult = e
      }
    }
    if (pick && processEv) {
      const gapDays = (parseTs(processEv.timestamp) - parseTs(pick.timestamp)) / dayMs
      const penalty = Math.max(0, gapDays - SOFT_DAYS.pickToProcess) * 8
      scores.push(clamp(100 - penalty, 55, 100))
    }
    if (handover && labResult) {
      const gapDays = (parseTs(labResult.timestamp) - parseTs(handover.timestamp)) / dayMs
      const penalty = Math.max(0, gapDays - SOFT_DAYS.handoverToLabResult) * 10
      scores.push(clamp(100 - penalty, 55, 100))
    }
  }

  const tradeEvents = events.filter(
    (e) =>
      ['BID_SUBMITTED', 'BANK_APPROVED'].includes(e.type) &&
      e.actorId === userId &&
      e.metadata &&
      typeof (e.metadata as { tradeId?: string }).tradeId === 'string',
  )
  const bank = tradeEvents.find((e) => e.type === 'BANK_APPROVED')
  const bid = tradeEvents.find((e) => e.type === 'BID_SUBMITTED')
  if (bank && bid) {
    const gapDays = (parseTs(bank.timestamp) - parseTs(bid.timestamp)) / dayMs
    const penalty = Math.max(0, gapDays - SOFT_DAYS.bidToBankApproval) * 6
    scores.push(clamp(100 - penalty, 55, 100))
  }

  if (scores.length === 0) {
    return 82
  }
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

const accuracyForUser = (userId: string, events: Event[], lots: Lot[]): number => {
  const processEvents = events.filter((e) => e.type === 'PROCESS' && e.actorId === userId)
  if (processEvents.length === 0) {
    const touched = lots.filter(
      (l) =>
        l.integrityStatus === 'OK' &&
        events.some(
          (ev) =>
            ev.actorId === userId && (ev.inputLotIds.includes(l.id) || ev.outputLotIds.includes(l.id)),
        ),
    )
    return touched.length > 0 ? 90 : 78
  }

  let sum = 0
  for (const e of processEvents) {
    const iq = e.inputQty
    const oq = e.outputQty
    if (iq === undefined || oq === undefined) {
      sum += 65
      continue
    }
    if (isMassBalanced(iq, oq, toMasses(e))) {
      sum += 100
    } else {
      const leak = Math.abs(iq - oq - sumLedgerByproductsKg(e.byproducts))
      sum += clamp(100 - Math.min(40, leak / 10), 40, 99)
    }
  }
  return Math.round(sum / processEvents.length)
}

const qualityForUser = (userId: string, store: LiveDataStore): number => {
  const user = store.users.find((u) => u.id === userId)
  if (!user) {
    return 75
  }

  if (user.role === 'lab') {
    const results = store.labResults.filter((r) => r.labUserId === userId)
    if (results.length === 0) {
      return 80
    }
    const avg =
      results.reduce((acc, r) => acc + (r.score ?? 82), 0) / results.length
    return clamp(Math.round(70 + (avg - 80) * 2), 60, 100)
  }

  if (user.role === 'farmer' || user.role === 'processor') {
    const lotIds = new Set<string>()
    for (const lot of store.lots) {
      if (lot.farmerId === userId) {
        lotIds.add(lot.id)
      }
    }
    if (user.role === 'processor') {
      for (const e of store.events) {
        if (e.actorId === userId) {
          e.outputLotIds.forEach((id) => lotIds.add(id))
        }
      }
    }
    const scores = store.labResults
      .filter((r) => lotIds.has(r.lotId) && r.status === 'APPROVED')
      .map((r) => r.score ?? 84)
    if (scores.length === 0) {
      return 84
    }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    return clamp(Math.round(75 + (avg - 82) * 3), 62, 100)
  }

  if (user.role === 'transporter') {
    const dispatch = store.events.filter((e) => e.type === 'DISPATCH' && e.actorId === userId).length
    const receipt = store.events.filter((e) => e.type === 'RECEIPT' && e.actorId === userId).length
    if (dispatch === 0 && receipt === 0) {
      return 80
    }
    return clamp(88 + Math.min(12, dispatch + receipt), 75, 100)
  }

  return 86
}

export const computeActorPerformance = (store: LiveDataStore, userId: string): ActorPerformanceBreakdown => {
  const timelinessScore = timelinessForUser(userId, store.events)
  const accuracyScore = accuracyForUser(userId, store.events, store.lots)
  const qualityAdherenceScore = qualityForUser(userId, store)
  const compositeScore = Math.round((timelinessScore + accuracyScore + qualityAdherenceScore) / 3)

  return {
    userId,
    timelinessScore,
    accuracyScore,
    qualityAdherenceScore,
    compositeScore,
  }
}

/** Ratings for active users (simulated MVP dashboard). */
export const computeAllActorPerformances = (store: LiveDataStore): ActorPerformanceBreakdown[] =>
  store.users
    .filter((u) => u.isActive)
    .map((u) => computeActorPerformance(store, u.id))
    .sort((a, b) => b.compositeScore - a.compositeScore)
