import Link from 'next/link'
import { notFound } from 'next/navigation'

import { LabResultForm } from '@/components/labs/lab-result-form'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function LabAssessLotPage({
  params,
}: {
  params: Promise<{ lotId: string }> | { lotId: string }
}) {
  const { lotId } = await params
  const store = await initializeLiveDataStore()
  const lot = store.lots.find((entry) => entry.id === lotId)

  if (!lot) {
    notFound()
  }

  const labUsers = store.users.filter((user) => user.role === 'lab' || user.role === 'admin')

  return (
    <div className="mt-8">
      <Link
        href="/lab"
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline"
      >
        ← Lab dashboard
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-950">Record lab result</h1>
      <p className="mt-3 text-sm text-slate-600">
        Results update <code className="rounded bg-slate-100 px-1 text-xs">lot.labStatus</code> and append a ledger
        event. Approval moves typical AT_LAB lots toward export readiness when quality clears.
      </p>
      <div className="mt-8 max-w-lg">
        {labUsers.length === 0 ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            No active lab or admin user is available in this snapshot. Add a lab user in master data to record
            results.
          </p>
        ) : (
          <LabResultForm
            lot={{
              id: lot.id,
              publicLotCode: lot.publicLotCode,
              labStatus: lot.labStatus,
              status: lot.status,
            }}
            labUsers={labUsers}
          />
        )}
      </div>
    </div>
  )
}
