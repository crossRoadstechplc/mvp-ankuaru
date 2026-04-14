import Link from 'next/link'

import { formatDisplayTimestamp } from '@/lib/format-operation-time'

export type LotTraceRef = {
  id: string
  publicLotCode: string
}

export type LotTraceabilityPanelProps = {
  lotId: string
  publicLotCode: string
  directFieldLabel?: string
  directFarmerLabel?: string
  originResolved: {
    fieldId?: string
    fieldName?: string
    farmerId?: string
    /** Kept for callers that resolve origin through lineage; not shown as a multi-hop path in the UI. */
    pathLotIds: string[]
    resolvedViaLineage: boolean
  }
  /** Direct parent snapshots only (no grandparents, no children). */
  directParentRefs: LotTraceRef[]
  currentStage: {
    snapshotStatus: string
    derivedHint?: string
    latestEventType?: string
  }
  handoffs: Array<{
    id: string
    timestamp: string
    type: string
    actorRole: string
    actorId: string
  }>
}

export function LotTraceabilityPanel({
  lotId,
  publicLotCode,
  directFieldLabel,
  directFarmerLabel,
  originResolved,
  directParentRefs,
  currentStage,
  handoffs,
}: LotTraceabilityPanelProps) {
  const showOriginBlock =
    Boolean(directFieldLabel || directFarmerLabel) ||
    originResolved.resolvedViaLineage ||
    Boolean(originResolved.fieldId || originResolved.farmerId)

  return (
    <section className="rounded-[2rem] border border-emerald-200/80 bg-emerald-50/40 p-6 shadow-sm shadow-black/5">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-900">Traceability</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Origin, stage, and direct parents</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Parent links are the immediate input lots from the ledger for this snapshot. Upstream grandparents and
        downstream child lots are not listed here.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-emerald-100 bg-white p-5">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Current stage</p>
          <dl className="mt-4 space-y-3 text-sm text-slate-800">
            <div>
              <dt className="font-medium text-slate-500">Snapshot status</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">{currentStage.snapshotStatus}</dd>
            </div>
            {currentStage.derivedHint ? (
              <div>
                <dt className="font-medium text-slate-500">Derived from latest event</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">{currentStage.derivedHint}</dd>
              </div>
            ) : null}
            {currentStage.latestEventType ? (
              <div>
                <dt className="font-medium text-slate-500">Latest ledger type</dt>
                <dd className="mt-1 font-mono text-sm text-slate-900">{currentStage.latestEventType}</dd>
              </div>
            ) : null}
          </dl>
        </article>

        {showOriginBlock ? (
          <article className="rounded-2xl border border-emerald-100 bg-white p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Field &amp; origin continuity</p>
            {originResolved.resolvedViaLineage ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950 ring-1 ring-amber-200">
                This lot has no direct field link on the snapshot. The field below is resolved by walking backward along
                ledger lineage to an earlier lot that recorded a field.
              </p>
            ) : null}
            <dl className="mt-4 space-y-3 text-sm text-slate-800">
              <div>
                <dt className="font-medium text-slate-500">Origin field</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {directFieldLabel ??
                    (originResolved.fieldName && originResolved.fieldId
                      ? `${originResolved.fieldName} (${originResolved.fieldId})`
                      : originResolved.fieldId ?? 'Not linked')}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Farmer (user)</dt>
                <dd className="mt-1 text-base font-semibold text-slate-950">
                  {directFarmerLabel ?? originResolved.farmerId ?? 'Not linked'}
                </dd>
              </div>
            </dl>
          </article>
        ) : null}
      </div>

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Direct parent lots</p>
        <p className="mt-1 text-xs text-slate-600">
          Immediate inputs for {publicLotCode} only — not grandparents or outputs.
        </p>
        {directParentRefs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No parent lots linked on the ledger for this snapshot.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {directParentRefs.map((ref) => (
              <li key={ref.id}>
                <Link href={`/lots/${ref.id}`} className="font-medium text-emerald-900 underline-offset-2 hover:underline">
                  {ref.publicLotCode}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {directParentRefs.length > 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            <Link href={`/lots/${lotId}/parents`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
              Parent lots page
            </Link>{' '}
            <span className="text-slate-500">({directParentRefs.length} direct source snapshot{directParentRefs.length === 1 ? '' : 's'})</span>
          </p>
        ) : null}
      </article>

      <article className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Role &amp; actor handoffs</p>
        <p className="mt-1 text-xs text-slate-600">Chronological ledger events that reference this lot (who acted).</p>
        {handoffs.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No events yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Role</th>
                  <th className="py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {handoffs.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-slate-800">{formatDisplayTimestamp(row.timestamp)}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{row.type}</td>
                    <td className="py-2 pr-3 text-slate-800">{row.actorRole}</td>
                    <td className="py-2 font-mono text-xs text-slate-700">{row.actorId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  )
}
