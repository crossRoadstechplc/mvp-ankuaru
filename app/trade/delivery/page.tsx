import Link from 'next/link'

import { PRE_DELIVERY_TRADE_STATUSES } from '@/lib/delivery/confirm-delivery'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TradeDeliveryHubPage() {
  const store = await initializeLiveDataStore()
  const pending = store.trades.filter((t) => PRE_DELIVERY_TRADE_STATUSES.includes(t.status))
  const done = store.trades.filter((t) => t.status === 'DELIVERED' || t.status === 'SETTLED')

  return (
    <div className="mt-8 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold text-slate-950">Delivery</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Importer (buyer) and exporter (seller) confirm receipt: weight, quality acceptance, notes, and any rebate or
          penalty adjustment. Updates trades, lots, and the event ledger (simulator).
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Awaiting confirmation</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No trades waiting for delivery confirmation.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/trade/delivery/${t.id}`}
                  className="block rounded-2xl border border-teal-200 bg-white p-4 shadow-sm transition hover:border-teal-400"
                >
                  <p className="font-mono text-xs text-slate-500">{t.id}</p>
                  <p className="mt-1 text-sm text-slate-700">Status: {t.status.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-teal-800">Open confirmation →</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Delivered</h2>
        {done.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">None yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {done.map((t) => (
              <li key={t.id}>
                <Link href={`/trade/delivery/${t.id}`} className="font-mono text-teal-800 underline-offset-2 hover:underline">
                  {t.id}
                </Link>
                {t.deliveryConfirmedAt ? (
                  <span className="ml-2 text-slate-500">· {t.deliveryConfirmedAt}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
