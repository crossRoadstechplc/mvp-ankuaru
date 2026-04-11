import Link from 'next/link'

import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TransportDashboardPage() {
  const store = await initializeLiveDataStore()
  const inTransit = store.lots.filter((l) => l.status === 'IN_TRANSIT')
  const transportEvents = store.events.filter((e) => e.type === 'DISPATCH' || e.type === 'RECEIPT').slice(-12)

  return (
    <div className="mt-8 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold text-slate-950">Transporter workspace</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Record <strong>dispatch</strong> when custody moves to the carrier (lot becomes <code className="rounded bg-slate-100 px-1 text-xs">IN_TRANSIT</code>
          ). Record <strong>receipt</strong> when the receiving party takes custody. Legal <strong>ownership</strong> stays
          on the lot snapshot unless changed elsewhere (e.g. trade settlement).
        </p>
      </header>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/transport/dispatch"
          className="rounded-full bg-sky-800 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Record dispatch
        </Link>
        <Link
          href="/transport/receipt"
          className="rounded-full border border-sky-300 bg-white px-5 py-2.5 text-sm font-semibold text-sky-950"
        >
          Record receipt
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Lots in transit</h2>
        {inTransit.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No lots are currently IN_TRANSIT.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {inTransit.map((lot) => (
              <li key={lot.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{lot.publicLotCode}</span>
                <span className="text-slate-600"> · custodian {lot.custodianRole}</span>
                <Link href={`/lots/${lot.id}`} className="ml-2 text-sky-800 underline-offset-2 hover:underline">
                  Lot timeline
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Recent transport events</h2>
        {transportEvents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No dispatch or receipt events yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {transportEvents.map((e) => (
              <li key={e.id} className="rounded-lg bg-slate-50 px-3 py-2">
                {e.type} · {e.timestamp} · lots {e.outputLotIds.join(', ')}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
