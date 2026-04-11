import Link from 'next/link'

import type { LotLineageHints } from '@/lib/traceability/lineage-graph'

export type LineageLotRef = {
  id: string
  publicLotCode: string
}

type LotLineagePanelProps = {
  parents: LineageLotRef[]
  children: LineageLotRef[]
  hints: LotLineageHints
}

export function LotLineagePanel({ parents, children, hints }: LotLineagePanelProps) {
  const hasEdges = parents.length > 0 || children.length > 0
  const hasHints = hints.isAggregateOutput || hints.isDisaggregateSource

  if (!hasEdges && !hasHints) {
    return null
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Lineage and transforms</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Parents, children, and split summaries</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Graph edges come from the event ledger (inputs → outputs). Aggregation and disaggregation are highlighted when
        recorded as explicit ledger events.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {hints.isAggregateOutput ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-950">
            Aggregated output ({hints.aggregateSourceCount} sources)
          </span>
        ) : null}
        {hints.isDisaggregateSource ? (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-950">
            Disaggregated into {hints.disaggregateChildCount} child lots
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Parent lots (inputs)</p>
          {parents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No parent lots linked via events.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {parents.map((lot) => (
                <li key={lot.id}>
                  <Link href={`/lots/${lot.id}`} className="font-medium text-amber-900 underline-offset-2 hover:underline">
                    {lot.publicLotCode}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-500">Child lots (outputs)</p>
          {children.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No child lots linked via events.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {children.map((lot) => (
                <li key={lot.id}>
                  <Link href={`/lots/${lot.id}`} className="font-medium text-amber-900 underline-offset-2 hover:underline">
                    {lot.publicLotCode}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
