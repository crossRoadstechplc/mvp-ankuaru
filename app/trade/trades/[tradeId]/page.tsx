import Link from 'next/link'
import { notFound } from 'next/navigation'

import { DeliveryStatusBadges } from '@/components/trade/delivery-status-badges'
import { TradeLifecycleBadges } from '@/components/trade/trade-lifecycle-badges'
import { PRE_DELIVERY_TRADE_STATUSES } from '@/lib/delivery/confirm-delivery'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TradeDetailPage({
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

  const canConfirm = PRE_DELIVERY_TRADE_STATUSES.includes(trade.status)

  return (
    <div className="mt-8 space-y-8">
      <div>
        <Link href="/trade" className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline">
          ← Trade hub
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Trade {trade.id}</h1>
        <p className="mt-2 font-mono text-xs text-slate-500">RFQ {trade.rfqId}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Lifecycle</h2>
        <p className="mt-2 text-sm text-slate-700">
          Status: <span className="font-medium">{trade.status.replace(/_/g, ' ')}</span>
        </p>
        <div className="mt-4">
          <TradeLifecycleBadges trade={trade} />
        </div>
        <div className="mt-4">
          <DeliveryStatusBadges trade={trade} showCommercialDetail />
        </div>
        <p className="mt-4 flex flex-wrap gap-4 text-sm">
          {canConfirm ? (
            <Link
              href={`/trade/delivery/${trade.id}`}
              className="font-semibold text-teal-800 underline-offset-2 hover:underline"
            >
              Confirm delivery →
            </Link>
          ) : null}
          <Link
            href={`/trade/settlement/${trade.id}`}
            className="font-semibold text-emerald-800 underline-offset-2 hover:underline"
          >
            Settlement &amp; margin (sim) →
          </Link>
        </p>
      </section>

      {trade.contractSummary ? (
        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6">
          <h2 className="text-lg font-semibold text-slate-950">Contract summary (generated)</h2>
          <p className="mt-3 text-sm leading-6 text-slate-700">{trade.contractSummary}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
        <h2 className="text-lg font-semibold text-slate-950">Linked lots</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {trade.lotIds.map((id) => (
            <li key={id}>
              <Link href={`/lots/${id}`} className="font-mono text-amber-900 underline-offset-2 hover:underline">
                {id}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
