'use client'

import { useState } from 'react'

import { btnCtaAmberClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
import type { Bid, RFQ, Role, Trade } from '@/lib/domain/types'
import { canViewBidCommercials, redactBidForRole } from '@/lib/trade-discovery/commercial-visibility'
import { canSelectWinningBidForRfq } from '@/lib/trade-discovery/discovery-permissions'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    method: init?.method ?? 'GET',
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return data
}

export type RfqBidsPanelProps = {
  rfq: RFQ
  bids: Bid[]
  linkedTrade?: Trade | null
}

export function RfqBidsPanel({ rfq, bids, linkedTrade }: RfqBidsPanelProps) {
  const sessionRole = useSessionStore((s) => s.currentUserRole)
  const sessionUserId = useSessionStore((s) => s.currentUserId)
  const uiRole = useUiStore((s) => s.selectedRole)

  const viewerRole: Role = (sessionRole ?? uiRole) as Role
  const canSelect = canSelectWinningBidForRfq(sessionUserId, sessionRole, rfq)

  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const showPriceHint = canViewBidCommercials(viewerRole)

  const handleSelect = async (bidId: string) => {
    setError(null)
    setBusyId(bidId)
    try {
      await fetchJson('/api/trade-discovery/select-bid', {
        method: 'POST',
        body: JSON.stringify({
          rfqId: rfq.id,
          bidId,
          rfqOwnerUserId: rfq.createdByUserId,
        }),
      })
      showAppToast('Winning bid selected. Trade is being linked.')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selection failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      {linkedTrade ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          Trade <span className="font-mono font-semibold">{linkedTrade.id}</span> linked to this RFQ (winning bid{' '}
          <span className="font-mono">{linkedTrade.winningBidId}</span>).
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {bids.map((bid) => {
          const view = redactBidForRole(bid, viewerRole)
          return (
            <article
              key={bid.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-black/5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{bid.id}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800">
                  {bid.status}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-950">
                {view.priceHidden ? (
                  <span className="text-base font-normal text-slate-500">Price restricted for your role</span>
                ) : (
                  <>${bid.price.toFixed(2)}</>
                )}
              </p>
              <p className="mt-2 text-sm text-slate-600">Bidder: {bid.bidderUserId}</p>
              {bid.lotIds.length > 0 ? (
                <p className="mt-1 text-sm text-slate-600">Lots: {bid.lotIds.join(', ')}</p>
              ) : null}
              {bid.notes ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-700">Bid notes</summary>
                  <p className="mt-2 text-slate-600">{bid.notes}</p>
                </details>
              ) : null}

              {rfq.status === 'OPEN' && bid.status === 'SUBMITTED' && canSelect ? (
                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void handleSelect(bid.id)}
                  className={`mt-4 ${btnCtaAmberClass}`}
                >
                  {busyId === bid.id ? 'Selecting…' : 'Select winning bid'}
                </button>
              ) : null}
            </article>
          )
        })}
      </div>

      {!showPriceHint && bids.length > 0 ? (
        <p className="text-xs text-slate-500">
          Commercial figures are hidden for your role. Sign in as an exporter or importer involved in the RFQ to see
          bid pricing where permitted.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
