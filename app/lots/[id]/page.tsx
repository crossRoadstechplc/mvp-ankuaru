import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LotIntegrityBanner } from '@/components/integrity/lot-integrity-banner'
import { DeliveryStatusBadges } from '@/components/trade/delivery-status-badges'
import { EventTimeline } from '@/components/events/event-timeline'
import { getTradeForLot } from '@/lib/delivery/trade-for-lot'
import { getLotWithDerivedState } from '@/lib/events/derived-state'
import { isInsuredInTransitDisplay } from '@/lib/transport/transport-state'
import { LotTraceabilityPanel } from '@/components/lots/lot-traceability-panel'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'
import {
  getBackwardTraceLotIds,
  getForwardTraceLotIds,
  resolveOriginFieldThroughLineage,
} from '@/lib/traceability/lineage-policy'
import { getChildLots, getLotLineageHints, getParentLots } from '@/lib/traceability/lineage-graph'

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  const store = await initializeLiveDataStore()
  const lotDetail = getLotWithDerivedState(store, resolvedParams.id)

  if (!lotDetail) {
    notFound()
  }

  const { lot } = lotDetail
  const field = lot.fieldId ? store.fields.find((entry) => entry.id === lot.fieldId) : undefined
  const farmerUser = lot.farmerId ? store.users.find((entry) => entry.id === lot.farmerId) : undefined

  const originFieldLabel = field ? `${field.name} (${field.id})` : lot.fieldId ? lot.fieldId : undefined
  const originFarmerLabel = farmerUser
    ? `${farmerUser.name} (${farmerUser.id})`
    : lot.farmerId
      ? lot.farmerId
      : undefined

  const parentLots = getParentLots(lot.id, store).map((entry) => ({
    id: entry.id,
    publicLotCode: entry.publicLotCode,
  }))
  const childLots = getChildLots(lot.id, store).map((entry) => ({
    id: entry.id,
    publicLotCode: entry.publicLotCode,
  }))
  const lineageHints = getLotLineageHints(lot.id, store.events)

  const lotRef = (id: string) => {
    const entry = store.lots.find((l) => l.id === id)
    return { id, publicLotCode: entry?.publicLotCode ?? id }
  }

  const originThroughLineage = resolveOriginFieldThroughLineage(store, lot.id)
  const resolvedFieldViaLineage = !lot.fieldId && Boolean(originThroughLineage.fieldId)

  const backwardTrace = getBackwardTraceLotIds(lot.id, store.events).map(lotRef)
  const forwardTrace = getForwardTraceLotIds(lot.id, store.events).map(lotRef)
  const pathLotRefs = originThroughLineage.pathLotIds.map(lotRef)

  const handoffs = lotDetail.timeline.map((event) => ({
    id: event.id,
    timestamp: event.timestamp,
    type: event.type,
    actorRole: event.actorRole,
    actorId: event.actorId,
  }))

  const transportTimeline = lotDetail.timeline.filter(
    (entry) => entry.type === 'DISPATCH' || entry.type === 'RECEIPT',
  )
  const insuredInTransit = isInsuredInTransitDisplay(lotDetail.lot, store.events)
  const linkedTrade = getTradeForLot(store, resolvedParams.id)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {linkedTrade ? (
        <section className="mb-8 rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-900">Trade & delivery</h2>
          <p className="mt-1 font-mono text-xs text-teal-800">
            Trade{' '}
            <Link href={`/trade/trades/${linkedTrade.id}`} className="underline-offset-2 hover:underline">
              {linkedTrade.id}
            </Link>
          </p>
          <div className="mt-3">
            <DeliveryStatusBadges trade={linkedTrade} showCommercialDetail />
          </div>
          <p className="mt-3 text-sm">
            <Link href={`/trade/delivery/${linkedTrade.id}`} className="font-medium text-teal-900 underline-offset-2 hover:underline">
              Open delivery workflow →
            </Link>
          </p>
        </section>
      ) : null}
      <LotIntegrityBanner lot={lot} />
      <LotTraceabilityPanel
        lotId={lot.id}
        publicLotCode={lot.publicLotCode}
        directFieldLabel={originFieldLabel}
        directFarmerLabel={originFarmerLabel}
        originResolved={{
          fieldId: originThroughLineage.fieldId,
          fieldName: originThroughLineage.fieldName,
          farmerId: originThroughLineage.farmerId,
          pathLotIds: originThroughLineage.pathLotIds,
          resolvedViaLineage: resolvedFieldViaLineage,
        }}
        pathLotRefs={pathLotRefs}
        currentStage={{
          snapshotStatus: lot.status,
          derivedHint: lotDetail.derived.statusHint,
          latestEventType: lotDetail.derived.latestEventType,
        }}
        handoffs={handoffs}
        backwardTrace={backwardTrace}
        forwardTrace={forwardTrace}
      />
      <EventTimeline
        lot={lotDetail.lot}
        derived={lotDetail.derived}
        timeline={lotDetail.timeline}
        transportTimeline={transportTimeline}
        insuredInTransit={insuredInTransit}
        showOriginCard={false}
        originFieldLabel={originFieldLabel}
        originFarmerLabel={originFarmerLabel}
        lineage={{
          parents: parentLots,
          children: childLots,
          hints: lineageHints,
        }}
      />
    </div>
  )
}
