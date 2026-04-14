import Link from 'next/link'

import { LabStatusBadge } from '@/components/labs/lab-status-badge'
import { btnCtaCyanClass } from '@/components/ui/button-styles'
import { PageIntro } from '@/components/ui/page-intro'
import { getLotsInLabQueue } from '@/lib/labs/lab-queue'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export const dynamic = 'force-dynamic'

export default async function LabDashboardPage() {
  const store = await initializeLiveDataStore()
  const queue = getLotsInLabQueue(store)
  const recent = store.labResults.slice(0, 8)

  return (
    <div className="mt-8 space-y-10">
      <PageIntro
        eyebrow="Lab"
        title="Quality queue"
        lead="Lots assigned by processor/transport appear here for review. Approved results append a LAB_RESULT event and drive export eligibility."
      />

      <section aria-labelledby="lab-queue-heading">
        <h2 id="lab-queue-heading" className="text-xl font-semibold text-slate-950">
          Incoming for testing
        </h2>
        {queue.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No lots are waiting in the lab queue.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.map((lot) => (
              <li
                key={lot.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-slate-950">{lot.publicLotCode}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {lot.form} · {lot.weight} kg · {lot.status}
                  </p>
                  <p className="mt-2">
                    <LabStatusBadge status={lot.labStatus} />
                  </p>
                </div>
                <Link href={`/lab/lots/${lot.id}/assess`} className={btnCtaCyanClass}>
                  Record result
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="lab-recent-heading">
        <h2 id="lab-recent-heading" className="text-xl font-semibold text-slate-950">
          Recent lab results
        </h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No lab results yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {recent.map((row) => (
              <li key={row.id} className="rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-medium text-slate-900">{row.id}</span> · lot{' '}
                <Link href={`/lots/${row.lotId}`} className="text-cyan-800 underline-offset-2 hover:underline">
                  {row.lotId}
                </Link>{' '}
                · <LabStatusBadge status={row.status} />{' '}
                {row.score !== undefined ? `· score ${row.score}` : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
