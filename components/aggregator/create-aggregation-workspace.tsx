'use client'

import { useRouter } from 'next/navigation'

import { AggregateLotsForm } from '@/components/lots/aggregate-lots-form'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
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
        <CollapsibleSection kicker="Aggregator" title="How aggregation works" defaultOpen>
          <p className="text-sm leading-6 text-slate-700">
            Pick two or more eligible lots: <strong>farmer-picked origin lots</strong> must be{' '}
            <strong>aggregator-validated</strong> first (see Lot validation). You may also combine lots where you are
            already <strong>owner</strong> or <strong>custodian</strong>. Set output weight (kg) and form, then submit. The
            API records an <code className="rounded bg-slate-100 px-1 text-xs">AGGREGATE</code> event and creates the new
            lot with you as owner. For lots outside these rules, sign in as <strong>admin</strong> and use{' '}
            <span className="font-medium">Admin → Lots → Aggregate</span>.
          </p>
        </CollapsibleSection>
        <CollapsibleSection kicker="Workflow" title="Select sources & submit" defaultOpen>
          <AggregateLotsForm
            lockedActorId={userId}
            includeFarmerOriginLots
            onSuccess={(lotId) => {
              router.refresh()
              router.push(`/lots/${lotId}`)
            }}
          />
        </CollapsibleSection>
      </div>
    )
  }

  if (role === 'admin') {
    return (
      <div className="space-y-6">
        <CollapsibleSection
          kicker="Admin"
          title="Platform aggregation"
          description="Unrestricted lot selection and actor choice for demos and data repair."
          className="border-violet-200 bg-violet-50/60"
          defaultOpen
        >
          <p className="text-sm text-violet-950">
            You can aggregate any eligible lots and choose the ledger actor (aggregator, processor, or admin). Use this
            for demos and data repair; aggregators use the restricted view when signed in as an aggregator.
          </p>
        </CollapsibleSection>
        <CollapsibleSection kicker="Workflow" title="Aggregate lots form" defaultOpen>
          <AggregateLotsForm
            onSuccess={(lotId) => {
              router.refresh()
              router.push(`/lots/${lotId}`)
            }}
          />
        </CollapsibleSection>
      </div>
    )
  }

  return (
    <CollapsibleSection
      kicker="Access"
      title="Wrong account for this workflow"
      className="border-amber-200 bg-amber-50"
      defaultOpen
    >
      <p className="text-sm text-amber-900/90">
        Sign in as an <strong>aggregator</strong> to combine lots in your custody, or as <strong>admin</strong> to use
        the full aggregation tool. Your current role is <span className="capitalize">{role ?? 'unknown'}</span>.
      </p>
    </CollapsibleSection>
  )
}
