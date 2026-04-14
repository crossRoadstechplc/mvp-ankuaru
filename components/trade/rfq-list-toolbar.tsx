'use client'

import Link from 'next/link'

import { btnCtaAmberClass } from '@/components/ui/button-styles'
import { canCreateDiscoveryRfq } from '@/lib/trade-discovery/discovery-permissions'
import { useSessionStore } from '@/store/session-store'

export function RfqListToolbar() {
  const role = useSessionStore((s) => s.currentUserRole)
  const canCreate = canCreateDiscoveryRfq(role)

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {!canCreate ? (
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 font-semibold text-slate-800">View only</span>
            New RFQs can only be published by exporter or importer accounts.
          </p>
        ) : null}
      </div>
      {canCreate ? (
        <Link href="/trade/rfqs/new" className={btnCtaAmberClass}>
          New RFQ
        </Link>
      ) : null}
    </div>
  )
}
