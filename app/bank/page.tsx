import Link from 'next/link'

import { TradeFinancingBadges } from '@/components/trade/trade-financing-badges'
import { TradeLifecycleBadges } from '@/components/trade/trade-lifecycle-badges'
import { PageIntro } from '@/components/ui/page-intro'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

const pending = (t: { bankApproved: boolean; status: string }) =>
  !t.bankApproved && ['DRAFT', 'OPEN', 'BID_SELECTED', 'BANK_PENDING'].includes(t.status)

export default async function BankDashboardPage() {
  const store = await initializeLiveDataStore()
  const queue = store.trades.filter(pending)
  const approved = store.trades.filter((t) => t.bankApproved).slice(0, 6)

  return (
    <div className="mt-8 space-y-10">
      <PageIntro
        eyebrow="Bank"
        title="Trade financing"
        lead="Review pending trades, margin terms (simulator), and collateral. Payment rails are not connected."
      />
      <p>
        <Link href="/bank/onboarding" className="text-sm font-medium text-violet-800 underline-offset-2 hover:underline">
          User onboarding queue →
        </Link>
      </p>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Pending bank decision</h2>
        {queue.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No trades awaiting financing review.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {queue.map((trade) => (
              <li key={trade.id}>
                <Link
                  href={`/bank/trades/${trade.id}`}
                  className="block rounded-2xl border border-violet-200 bg-white p-5 shadow-sm transition hover:border-violet-400"
                >
                  <p className="font-mono text-xs text-slate-500">{trade.id}</p>
                  <p className="mt-2 text-sm text-slate-600">Status: {trade.status}</p>
                  <p className="mt-1 text-sm text-slate-600">Lots: {trade.lotIds.join(', ') || '—'}</p>
                  <div className="mt-3">
                    <TradeFinancingBadges trade={trade} collateralActive={false} />
                  </div>
                  <span className="mt-3 inline-block text-sm font-medium text-violet-800">Open review →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Recently approved</h2>
        {approved.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">None yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {approved.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-mono">{t.id}</span>
                <TradeFinancingBadges
                  trade={t}
                  collateralActive={t.lotIds.some((id) => store.lots.find((l) => l.id === id)?.isCollateral)}
                />
                <Link href={`/bank/trades/${t.id}`} className="text-violet-800 underline-offset-2 hover:underline">
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Margin calls &amp; liquidation</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor trades where price simulation triggered a margin call, or where collateral was liquidated.
        </p>
        {(() => {
          const risk = store.trades.filter((t) =>
            ['MARGIN_CALL', 'DEFAULTED', 'LIQUIDATED'].includes(t.status),
          )
          return risk.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No trades in margin call or liquidation in seed data.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {risk.map((t) => (
                <li key={t.id} className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm">{t.id}</span>
                    <Link
                      href={`/trade/settlement/${t.id}`}
                      className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                    >
                      Open risk tools →
                    </Link>
                  </div>
                  <div className="mt-2">
                    <TradeLifecycleBadges trade={t} />
                  </div>
                </li>
              ))}
            </ul>
          )
        })()}
      </section>
    </div>
  )
}
