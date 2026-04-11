import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeliveryConfirmationForm } from '@/components/trade/delivery-confirmation-form'
import { DeliveryStatusBadges } from '@/components/trade/delivery-status-badges'
import { PRE_DELIVERY_TRADE_STATUSES } from '@/lib/delivery/confirm-delivery'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TradeDeliveryDetailPage({
  params,
}: {
  params: Promise<{ tradeId: string }> | { tradeId: string }
}) {
  const { tradeId } = await params
  const store = await initializeLiveDataStore()
  const trade = store.trades.find((t) => t.id === tradeId)
  if (!trade) {
    notFound()
  }

  const buyer = store.users.find((u) => u.id === trade.buyerUserId)
  const seller = store.users.find((u) => u.id === trade.sellerUserId)
  const admin = store.users.find((u) => u.role === 'admin' && u.isActive)

  const actorOptions = [
    ...(buyer ? [{ id: buyer.id, label: `${buyer.name} (buyer)` }] : []),
    ...(seller ? [{ id: seller.id, label: `${seller.name} (seller)` }] : []),
    ...(admin ? [{ id: admin.id, label: `${admin.name} (admin)` }] : []),
  ]

  const firstLot = trade.lotIds[0] ? store.lots.find((l) => l.id === trade.lotIds[0]) : undefined
  const defaultWeight = firstLot?.weight

  const canConfirm = PRE_DELIVERY_TRADE_STATUSES.includes(trade.status)

  return (
    <div className="mt-8 space-y-8">
      <div>
        <Link href="/trade/delivery" className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
          ← Delivery hub
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Trade {trade.id}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Buyer: {buyer?.name ?? trade.buyerUserId} · Seller: {seller?.name ?? trade.sellerUserId}
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Delivery state</h2>
        <div className="mt-3">
          <DeliveryStatusBadges trade={trade} showCommercialDetail />
        </div>
        {trade.deliveryNotes ? (
          <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{trade.deliveryNotes}</p>
        ) : null}
      </section>

      {canConfirm ? (
        <DeliveryConfirmationForm
          tradeId={trade.id}
          actorOptions={actorOptions}
          defaultWeightKg={defaultWeight}
        />
      ) : (
        <p className="text-sm text-slate-600">
          Delivery already recorded for this trade. See{' '}
          <Link className="text-teal-800 underline" href={`/trade/trades/${trade.id}`}>
            trade detail
          </Link>
          .
        </p>
      )}
    </div>
  )
}
