'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { CollapsibleSection } from '@/components/ui/collapsible-section'
import { useLiveDataPoll } from '@/hooks/use-live-data-poll'
import type { Lot } from '@/lib/domain/types'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'
import { lotIsFarmerOriginHeldAtFarm } from '@/lib/lots/lot-validation-gates'
import { useLiveDataClientStore } from '@/store/live-data-client-store'

const farmerOriginBuckets = (lots: Lot[]) => {
  const held = lots.filter(lotIsFarmerOriginHeldAtFarm)
  return {
    awaiting: held.filter((l) => l.validationStatus === 'PENDING'),
    validated: held.filter((l) => l.validationStatus === 'VALIDATED'),
    rejected: held.filter((l) => l.validationStatus === 'REJECTED'),
  }
}

function LotRow({ lot }: { lot: Lot }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
      <div>
        <span className="font-mono font-semibold text-slate-950">{lot.publicLotCode}</span>
        <span className="ml-2 text-sm text-slate-600">
          {lot.form} · declared {lot.weight} kg
          {lot.validationStatus !== 'PENDING' && lot.observedWeight !== undefined ? (
            <> · observed {lot.observedWeight} kg</>
          ) : null}
          {' · '}
          {formatDisplayTimestamp(lot.updatedAt)}
        </span>
      </div>
      <Link
        href={`/aggregator/lot-validation/${lot.id}`}
        className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
      >
        {lot.validationStatus === 'PENDING' ? 'Open validation' : 'View / history'}
      </Link>
    </li>
  )
}

export function LotValidationHub() {
  const lots = useLiveDataClientStore((s) => s.lots)
  const loading = useLiveDataClientStore((s) => s.lotsLoading)
  const error = useLiveDataClientStore((s) => s.lotsError)
  useLiveDataPoll('lots')

  const { awaiting, validated, rejected } = useMemo(() => farmerOriginBuckets(lots), [lots])

  if (loading) {
    return <p className="text-sm text-slate-600">Loading lots…</p>
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>
  }

  return (
    <div className="space-y-6">
      <CollapsibleSection kicker="Guide" title="How validation works" defaultOpen={false}>
        <p className="text-sm leading-6 text-slate-700">
          Farmer-picked lots start as <strong>PENDING</strong>. Record observed weight, notes, then approve or reject.
          Only <strong>VALIDATED</strong> lots appear in the aggregation picker (with integrity OK and eligible status).
        </p>
      </CollapsibleSection>

      <CollapsibleSection
        id="awaiting"
        kicker="Queue"
        title="Awaiting validation"
        description={`${awaiting.length} farmer-held lot(s)`}
        className="border-amber-200 bg-amber-50/50"
        summaryAddon={
          awaiting.length > 0 ? (
            <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-bold text-white">{awaiting.length}</span>
          ) : null
        }
        defaultOpen
      >
        {awaiting.length === 0 ? (
          <p className="text-sm text-slate-600">None right now.</p>
        ) : (
          <ul className="space-y-1">
            {awaiting.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="validated"
        kicker="Cleared"
        title="Validated lots"
        description={`${validated.length} cleared for aggregation`}
        className="border-emerald-200 bg-emerald-50/40"
        defaultOpen
      >
        {validated.length === 0 ? (
          <p className="text-sm text-slate-600">None yet.</p>
        ) : (
          <ul className="space-y-1">
            {validated.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="rejected"
        kicker="Blocked"
        title="Rejected lots"
        description="Not eligible for aggregation"
        className="border-rose-200 bg-rose-50/40"
        defaultOpen
      >
        {rejected.length === 0 ? (
          <p className="text-sm text-slate-600">None.</p>
        ) : (
          <ul className="space-y-1">
            {rejected.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  )
}
