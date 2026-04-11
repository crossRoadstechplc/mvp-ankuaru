import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LotIntegrityBanner } from '@/components/integrity/lot-integrity-banner'
import { DeliveryStatusBadges } from '@/components/trade/delivery-status-badges'
import { EventTimeline } from '@/components/events/event-timeline'
import { getTradeForLot } from '@/lib/delivery/trade-for-lot'
import { getLotWithDerivedState } from '@/lib/events/derived-state'
import { canImporterViewLot } from '@/lib/permissions/importer-access'
import { redactTradeForRole } from '@/lib/trade-discovery/commercial-visibility'
import { isInsuredInTransitDisplay } from '@/lib/transport/transport-state'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'
import { getChildLots, getLotLineageHints, getParentLots } from '@/lib/traceability/lineage-graph'

const DEFAULT_BUYER = 'user-importer-001'

export default async function ImporterLotDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }> | { id: string }
  searchParams: Promise<{ buyerUserId?: string }> | { buyerUserId?: string }
}) {
  const { id } = await params
  const sp = await searchParams
  const buyerUserId = sp.buyerUserId ?? DEFAULT_BUYER

  const store = await initializeLiveDataStore()
  if (!canImporterViewLot(store, id, buyerUserId)) {
    notFound()
  }

  const lotDetail = getLotWithDerivedState(store, id)
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

  const transportTimeline = lotDetail.timeline.filter(
    (entry) => entry.type === 'DISPATCH' || entry.type === 'RECEIPT',
  )
  const insuredInTransit = isInsuredInTransitDisplay(lotDetail.lot, store.events)
  const linkedTrade = getTradeForLot(store, id)
  const tradeView = linkedTrade ? redactTradeForRole(linkedTrade, 'importer', 'physical_truth') : null

  return (
    <div>
      {tradeView ? (
        <section className="mb-8 rounded-2xl border border-teal-200 bg-teal-50/50 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-teal-900">Shipment & status</h2>
          <p className="mt-1 font-mono text-xs text-teal-800">
            Trade {tradeView.id}
            {tradeView.commercialHidden ? (
              <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-teal-900">
                Commercial detail hidden
              </span>
            ) : null}
          </p>
          <div className="mt-3">
            <DeliveryStatusBadges trade={tradeView} showCommercialDetail={!tradeView.commercialHidden} />
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Pricing, margins, and financing appear only in the deal workspace — not on the physical trace.
          </p>
          <p className="mt-2 text-sm">
            <Link href={`/trade/trades/${tradeView.id}`} className="font-medium text-teal-900 underline-offset-2 hover:underline">
              Open trade workspace →
            </Link>
          </p>
        </section>
      ) : null}
      <LotIntegrityBanner lot={lot} />
      <EventTimeline
        lot={lotDetail.lot}
        derived={lotDetail.derived}
        timeline={lotDetail.timeline}
        transportTimeline={transportTimeline}
        insuredInTransit={insuredInTransit}
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
