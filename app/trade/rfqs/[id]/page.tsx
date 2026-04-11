import Link from 'next/link'
import { notFound } from 'next/navigation'

import { RfqBidSectionClient } from '@/components/trade/rfq-bid-section-client'
import { RfqBidsPanel } from '@/components/trade/rfq-bids-panel'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function RfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await params
  const store = await initializeLiveDataStore()
  const rfq = store.rfqs.find((r) => r.id === id)
  if (!rfq) {
    notFound()
  }

  const bids = store.bids.filter((b) => b.rfqId === id)
  const linkedTrade = store.trades.find((t) => t.rfqId === id) ?? null
  const bidderUsers = store.users.filter((u) => u.isActive && (u.role === 'exporter' || u.role === 'importer'))

  return (
    <div className="mt-8 space-y-10">
      <Link href="/trade/rfqs" className="text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline">
        ← All RFQs
      </Link>

      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-slate-950">{rfq.id}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              rfq.status === 'OPEN' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {rfq.status}
          </span>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Quantity</dt>
            <dd className="font-medium text-slate-950">{rfq.quantity} kg</dd>
          </div>
          <div>
            <dt className="text-slate-500">Location</dt>
            <dd className="font-medium text-slate-950">{rfq.location}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Quality</dt>
            <dd className="font-medium text-slate-950">{rfq.qualityRequirement}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Created by</dt>
            <dd className="font-mono text-slate-800">{rfq.createdByUserId}</dd>
          </div>
        </dl>
        {rfq.notes ? (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer font-medium text-amber-900">Internal notes</summary>
            <p className="mt-2 text-slate-600">{rfq.notes}</p>
          </details>
        ) : null}
      </header>

      <RfqBidSectionClient rfq={rfq} bidderUsers={bidderUsers} lots={store.lots} />

      <section>
        <h2 className="text-lg font-semibold text-slate-950">Bids & selection</h2>
        <p className="mt-1 text-sm text-slate-600">
          The RFQ owner (exporter or importer who published it) can select a winning bid when signed in; that creates a
          trade and closes the RFQ.
        </p>
        <div className="mt-4">
          <RfqBidsPanel rfq={rfq} bids={bids} linkedTrade={linkedTrade} />
        </div>
      </section>
    </div>
  )
}
