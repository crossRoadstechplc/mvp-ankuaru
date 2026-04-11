import Link from 'next/link'

import { RfqListToolbar } from '@/components/trade/rfq-list-toolbar'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function RfqListPage() {
  const store = await initializeLiveDataStore()
  const rfqs = [...store.rfqs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="mt-8 space-y-8">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">RFQs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Open requests accept bids from exporter or importer accounts. Use the{' '}
            <Link href="/discovery" className="font-medium text-amber-900 underline-offset-2 hover:underline">
              Discovery
            </Link>{' '}
            workspace for a shared marketplace view, or open a row for detail and selection.
          </p>
        </div>
        <RfqListToolbar />
      </header>

      <ul className="grid gap-4 md:grid-cols-2">
        {rfqs.map((rfq) => (
          <li key={rfq.id}>
            <Link
              href={`/trade/rfqs/${rfq.id}`}
              className="block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5 transition hover:border-amber-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-slate-500">{rfq.id}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    rfq.status === 'OPEN' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {rfq.status}
                </span>
              </div>
              <p className="mt-3 text-lg font-semibold text-slate-950">{rfq.quantity} kg</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-700">{rfq.qualityRequirement}</p>
              <p className="mt-2 text-sm text-slate-500">{rfq.location}</p>
              {rfq.notes ? (
                <p className="mt-2 line-clamp-2 text-sm text-slate-500">{rfq.notes}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
