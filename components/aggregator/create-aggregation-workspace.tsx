'use client'

import { useRouter } from 'next/navigation'

import { AggregateLotsForm } from '@/components/lots/aggregate-lots-form'
import { useSessionStore } from '@/store/session-store'

export function CreateAggregationWorkspace() {
  const router = useRouter()
  const userId = useSessionStore((s) => s.currentUserId)
  const role = useSessionStore((s) => s.currentUserRole)

  if (!userId) {
    return null
  }

  if (role === 'aggregator') {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-slate-950">Combine farmer lots or lots in your custody</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Pick two or more eligible lots: <strong>farmer-picked origin lots</strong> must be{' '}
            <strong>aggregator-validated</strong> first (see Lot validation). You may also combine lots where you are
            already <strong>owner</strong> or <strong>custodian</strong>. Set output weight (kg) and form, then submit. The
            API records an <code className="rounded bg-slate-100 px-1 text-xs">AGGREGATE</code> event and creates the new
            lot with you as owner. For lots outside these rules, sign in as <strong>admin</strong> and use{' '}
            <span className="font-medium">Admin → Lots → Aggregate</span>.
          </p>
        </section>
        <AggregateLotsForm
          lockedActorId={userId}
          includeFarmerOriginLots
          onSuccess={(lotId) => router.push(`/lots/${lotId}`)}
        />
      </div>
    )
  }

  if (role === 'admin') {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-6 text-sm text-violet-950">
          <p className="font-medium">Platform admin</p>
          <p className="mt-2 text-violet-900/90">
            You can aggregate any eligible lots and choose the ledger actor (aggregator, processor, or admin). Use this
            for demos and data repair; aggregators use the restricted view when signed in as an aggregator.
          </p>
        </section>
        <AggregateLotsForm onSuccess={(lotId) => router.push(`/lots/${lotId}`)} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
      <p className="font-medium">Wrong account for this workflow</p>
      <p className="mt-2 text-amber-900/90">
        Sign in as an <strong>aggregator</strong> to combine lots in your custody, or as <strong>admin</strong> to use
        the full aggregation tool. Your current role is{' '}
        <span className="capitalize">{role ?? 'unknown'}</span>.
      </p>
    </div>
  )
}
