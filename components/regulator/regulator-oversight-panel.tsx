import Link from 'next/link'

import type { TradePublic } from '@/lib/trade-discovery/commercial-visibility'

type Props = {
  trades: TradePublic[]
}

/**
 * Read-only trade list with commercial fields already removed server-side.
 */
export function RegulatorOversightPanel({ trades }: Props) {
  return (
    <section
      className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5"
      data-testid="regulator-oversight-panel"
    >
      <h2 className="text-lg font-semibold text-slate-950">Trades (oversight)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Status and lot linkage only — no prices, margins, financing, or counterparty user ids.
      </p>
      <ul className="mt-6 divide-y divide-slate-100">
        {trades.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="font-mono text-sm font-semibold text-slate-950">{t.id}</p>
              <p className="mt-1 text-xs text-slate-500">
                Status {t.status} · Lots {t.lotIds.join(', ') || '—'}
              </p>
              {t.counterpartiesRedacted ? (
                <p className="mt-1 text-xs font-medium text-amber-800">Counterparties withheld</p>
              ) : null}
              {t.commercialHidden ? (
                <p className="mt-1 text-xs text-slate-500">Commercial fields redacted</p>
              ) : null}
            </div>
            <Link
              href={`/trade/trades/${t.id}`}
              className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
            >
              Timeline →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
