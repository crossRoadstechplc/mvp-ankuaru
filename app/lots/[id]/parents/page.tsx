import Link from 'next/link'
import { notFound } from 'next/navigation'

import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'
import { getParentLots } from '@/lib/traceability/lineage-graph'

export const dynamic = 'force-dynamic'

export default async function LotParentsOnlyPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const resolvedParams = await params
  const store = await initializeLiveDataStore()
  const lot = store.lots.find((l) => l.id === resolvedParams.id)

  if (!lot) {
    notFound()
  }

  const parents = getParentLots(lot.id, store)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Parent lots only</p>
        <h1 className="text-2xl font-semibold text-slate-950">{lot.publicLotCode}</h1>
        <p className="text-sm text-slate-600">
          Direct upstream snapshots for this lot (ledger input edges only). This page does not show children, timelines, or
          the full trace flow.
        </p>
        <p className="text-sm">
          <Link href={`/lots/${lot.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
            ← Full lot detail
          </Link>
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Source snapshots</h2>
        {parents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            No parent lots are linked for this lot in the current ledger. Origin picks and other roots may have no upstream
            snapshots.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {parents.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                <div>
                  <p className="font-mono font-semibold text-slate-950">{p.publicLotCode}</p>
                  <p className="text-sm text-slate-600">
                    {p.form} · {p.weight} kg · {p.status}
                  </p>
                </div>
                <Link
                  href={`/lots/${p.id}/parents`}
                  className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline"
                >
                  Their parents
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
