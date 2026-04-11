import Link from 'next/link'

import { RunIntegrityButton } from '@/app/admin/integrity/run-integrity-button'
import { buildIntegritySummary } from '@/lib/integrity/summary'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminIntegrityPage() {
  const store = await initializeLiveDataStore()
  const summary = buildIntegritySummary(store)

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Integrity engine</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">System truth & quarantine</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-700">
          On-demand scans evaluate the append-only ledger against lot snapshots. Failed checks mark lots compromised,
          move them to quarantine, and block operational workflows. Scans also run automatically after new events are
          appended.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Total lots</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.totalLots}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Compromised</p>
          <p className="mt-3 text-4xl font-semibold text-rose-700">{summary.compromisedCount}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Quarantined</p>
          <p className="mt-3 text-4xl font-semibold text-amber-800">{summary.quarantinedCount}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Integrity events</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.integrityFlaggedEventCount}</p>
          <p className="mt-2 text-xs text-slate-600">INTEGRITY_FLAGGED rows in the ledger</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-sm shadow-black/5">
        <h3 className="text-lg font-semibold text-slate-950">Run checks</h3>
        <p className="mt-2 text-sm text-slate-600">
          Dry run reports issues without writing. Apply updates quarantine flags and records integrity events for newly
          flagged lots.
        </p>
        <div className="mt-6">
          <RunIntegrityButton />
        </div>
      </section>

      {summary.compromisedLotIds.length > 0 ? (
        <section className="rounded-[2rem] border border-rose-100 bg-rose-50/50 p-8">
          <h3 className="text-lg font-semibold text-rose-950">Compromised lots</h3>
          <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-rose-950">
            {summary.compromisedLotIds.map((id) => (
              <li key={id}>
                <Link href={`/lots/${id}`} className="font-mono underline-offset-2 hover:underline">
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
