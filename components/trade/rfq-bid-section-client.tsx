'use client'

import type { Lot, RFQ, User } from '@/lib/domain/types'
import { canSubmitDiscoveryBid } from '@/lib/trade-discovery/discovery-permissions'
import { useSessionStore } from '@/store/session-store'

import { SubmitBidForm } from './submit-bid-form'

type Props = {
  rfq: RFQ
  bidderUsers: User[]
  lots: Lot[]
}

export function RfqBidSectionClient({ rfq, bidderUsers, lots }: Props) {
  const role = useSessionStore((s) => s.currentUserRole)

  if (rfq.status !== 'OPEN') {
    return null
  }

  if (!canSubmitDiscoveryBid(role)) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold text-slate-950">Submit a bid</h2>
        <p className="mt-2 text-sm text-slate-600">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-800">View only</span>{' '}
          Only exporter or importer accounts can submit bids on open RFQs.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-6">
      <h2 className="text-lg font-semibold text-slate-950">Submit a bid</h2>
      <p className="mt-1 text-sm text-slate-600">Progressive form — lots are optional references for traceability.</p>
      <div className="mt-4 max-w-lg">
        <SubmitBidForm rfqId={rfq.id} bidderUsers={bidderUsers} lots={lots} />
      </div>
    </section>
  )
}
