import Link from 'next/link'

import { btnPrimaryClass, btnSecondaryClass } from '@/components/ui/button-styles'
import { PageIntro } from '@/components/ui/page-intro'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TradeHubPage() {
  const store = await initializeLiveDataStore()
  const trades = [...store.trades].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)

  return (
    <div className="mt-8 space-y-8">
      <PageIntro
        eyebrow="Trade"
        title="RFQs, bids, and trades"
        lead="Structured trade records from the live store. Discovery is the shared marketplace; use this hub for RFQs and delivery."
      />
      <div className="flex flex-wrap gap-3">
        <Link href="/discovery" className={btnPrimaryClass}>
          Discovery
        </Link>
        <Link href="/trade/rfqs/new" className={btnSecondaryClass}>
          New RFQ
        </Link>
        <Link href="/trade/rfqs" className={btnSecondaryClass}>
          RFQs
        </Link>
        <Link
          href="/trade/delivery"
          className="inline-flex items-center justify-center rounded-full border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-semibold text-teal-950 hover:bg-teal-100/80"
        >
          Delivery
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-slate-950">Recent trades</h2>
        {trades.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No trades in the store.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {trades.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <span className="font-mono text-slate-800">{t.id}</span>
                <span className="text-slate-600">{t.status}</span>
                <span className="flex flex-wrap gap-3 text-amber-900">
                  <Link href={`/trade/trades/${t.id}`} className="font-medium underline-offset-2 hover:underline">
                    Trade
                  </Link>
                  <Link href={`/trade/settlement/${t.id}`} className="font-medium underline-offset-2 hover:underline">
                    Settlement
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
