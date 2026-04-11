import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LineageViewer } from '@/components/lineage/lineage-viewer'
import { buildBackwardLineageTree, buildForwardLineageTree } from '@/lib/traceability/lineage-graph'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function LotLineagePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await params
  const store = await initializeLiveDataStore()
  const lot = store.lots.find((entry) => entry.id === id)

  if (!lot) {
    notFound()
  }

  const backwardRoot = buildBackwardLineageTree(id, store)
  const forwardRoot = buildForwardLineageTree(id, store)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="border-b border-black/10 pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Stage 07 · Traceability</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">Lineage explorer</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Graph view derived from event input/output links. Expand nodes to walk upstream or downstream without treating
          the supply chain as a single strict tree.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/lots/${id}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            ← Lot detail & events
          </Link>
          <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">
            Home
          </Link>
        </div>
      </header>

      <div className="mt-8">
        <LineageViewer lotId={id} backwardRoot={backwardRoot} forwardRoot={forwardRoot} />
      </div>
    </div>
  )
}
