'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { Bid, LiveDataStore, RFQ, Trade } from '@/lib/domain/types'
import { redactBidForRole } from '@/lib/trade-discovery/commercial-visibility'
import {
  canCreateDiscoveryRfq,
  canSubmitDiscoveryBid,
  isDiscoveryActorRole,
} from '@/lib/trade-discovery/discovery-permissions'
import { useSessionStore } from '@/store/session-store'

type Props = {
  store: LiveDataStore
}

const statusBadge = (status: string) => {
  const open = status === 'OPEN'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${open ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  )
}

function RfqCard({
  rfq,
  onSelect,
  selected,
  readOnly,
}: {
  rfq: RFQ
  onSelect: () => void
  selected: boolean
  readOnly: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-5 text-left shadow-sm transition hover:border-amber-300 ${
        selected ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-200/70' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{rfq.id}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">Auction</span>
          {readOnly ? (
            <span
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
              data-testid="discovery-rfq-view-only-badge"
            >
              View only
            </span>
          ) : null}
          {statusBadge(rfq.status)}
        </div>
      </div>
      <p className="mt-3 text-lg font-semibold text-slate-950">{rfq.quantity} kg</p>
      <p className="mt-1 line-clamp-2 text-sm text-slate-700">{rfq.qualityRequirement}</p>
      <p className="mt-2 text-sm text-slate-500">{rfq.location}</p>
      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{rfq.notes}</p>
    </button>
  )
}

export function DiscoveryWorkspace({ store }: Props) {
  const role = useSessionStore((s) => s.currentUserRole)
  const userId = useSessionStore((s) => s.currentUserId)
  const isActor = isDiscoveryActorRole(role)
  const readOnly = !isActor

  const [focusRfqId, setFocusRfqId] = useState<string | null>(null)

  const rfqsSorted = useMemo(() => [...store.rfqs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [store.rfqs])

  const openRfqs = useMemo(() => rfqsSorted.filter((r) => r.status === 'OPEN'), [rfqsSorted])
  const closedRfqs = useMemo(() => rfqsSorted.filter((r) => r.status !== 'OPEN'), [rfqsSorted])

  const myRfqs = useMemo(
    () => (userId ? rfqsSorted.filter((r) => r.createdByUserId === userId) : []),
    [rfqsSorted, userId],
  )
  const myBids = useMemo(
    () => (userId ? store.bids.filter((b) => b.bidderUserId === userId) : []),
    [store.bids, userId],
  )

  const tradesByRfq = useMemo(() => {
    const m = new Map<string, Trade>()
    for (const t of store.trades) {
      m.set(t.rfqId, t)
    }
    return m
  }, [store.trades])

  const focusRfq: RFQ | null = focusRfqId ? store.rfqs.find((r) => r.id === focusRfqId) ?? null : null
  const focusBids: Bid[] = focusRfq ? store.bids.filter((b) => b.rfqId === focusRfq.id) : []
  const viewerRole = role ?? 'regulator'
  const submittedBids = useMemo(() => store.bids.filter((b) => b.status === 'SUBMITTED').length, [store.bids])

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-800">Discovery</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Marketplace & opportunities</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          {readOnly
            ? 'Shared RFQ board — everyone signed in can browse open and closed opportunities. Publishing, bidding, and selecting a winner are limited to exporter and importer accounts.'
            : 'Publish RFQs, submit bids, and select winners. Other roles see the same board with view-only controls.'}
        </p>
        <p className="max-w-2xl text-xs leading-5 text-slate-500">
          This MVP uses firm bids only — there is no separate IOI (indication of interest) or non-binding offer
          workflow.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {readOnly ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
              Read-only — exporter / importer actions only
            </span>
          ) : (
            <>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Trade actions enabled
              </span>
              <Link href="/trade/rfqs" className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline">
                Full RFQ list
              </Link>
              {canCreateDiscoveryRfq(role) ? (
                <Link
                  href="/trade/rfqs/new"
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  New RFQ
                </Link>
              ) : null}
            </>
          )}
        </div>
      </header>

      <section className="space-y-4" aria-labelledby="discovery-open-heading">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Open RFQs</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{openRfqs.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active bids</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{submittedBids}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Closed rounds</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{closedRfqs.length}</p>
          </div>
        </div>
        <h2 id="discovery-open-heading" className="text-lg font-semibold text-slate-950">
          Open opportunities
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openRfqs.map((rfq) => (
            <RfqCard
              key={rfq.id}
              rfq={rfq}
              selected={focusRfqId === rfq.id}
              onSelect={() => setFocusRfqId(rfq.id)}
              readOnly={readOnly}
            />
          ))}
        </div>
        {openRfqs.length === 0 ? <p className="text-sm text-slate-500">No open RFQs.</p> : null}
      </section>

      {isActor ? (
        <section className="space-y-4" aria-labelledby="discovery-my-actions-heading">
          <h2 id="discovery-my-actions-heading" className="text-lg font-semibold text-slate-950">
            My actions
          </h2>
          <p className="text-sm text-slate-600">
            RFQs you published and bids you submitted (exporter / importer only).
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">RFQs you published</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {myRfqs.length === 0 ? <li className="text-slate-500">None yet.</li> : null}
                {myRfqs.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="text-left font-mono text-amber-900 hover:underline" onClick={() => setFocusRfqId(r.id)}>
                      {r.id}
                    </button>{' '}
                    · {r.status}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Bids you submitted</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-800">
                {myBids.length === 0 ? <li className="text-slate-500">None yet.</li> : null}
                {myBids.map((b) => (
                  <li key={b.id}>
                    <span className="font-mono">{b.id}</span> · RFQ {b.rfqId} · {b.status}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="discovery-closed-heading">
        <h2 id="discovery-closed-heading" className="text-lg font-semibold text-slate-950">
          Selected / closed
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {closedRfqs.map((rfq) => {
            const trade = tradesByRfq.get(rfq.id)
            return (
              <div key={rfq.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-600">{rfq.id}</span>
                  <div className="flex gap-2">
                    {statusBadge(rfq.status)}
                    {trade ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                        Trade
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-700">{rfq.qualityRequirement}</p>
                {trade ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Trade <span className="font-mono">{trade.id}</span> · {trade.status}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
        {closedRfqs.length === 0 ? <p className="text-sm text-slate-500">No closed RFQs yet.</p> : null}
      </section>

      {focusRfq ? (
        <aside className="rounded-[2rem] border border-amber-200 bg-amber-50/40 p-6 shadow-inner">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Detail</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">{focusRfq.id}</h3>
              <p className="mt-2 text-sm text-slate-700">{focusRfq.qualityRequirement}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {readOnly ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                  Read-only detail
                </span>
              ) : null}
              {statusBadge(focusRfq.status)}
            </div>
          </div>
          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Quantity</dt>
              <dd className="font-medium">{focusRfq.quantity} kg</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium">{focusRfq.location}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={`/trade/rfqs/${focusRfq.id}`}
              className={
                readOnly
                  ? 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50'
                  : 'rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900'
              }
            >
              {readOnly ? 'View RFQ (read-only)' : 'Open full RFQ'}
            </Link>
            {canSubmitDiscoveryBid(role) && focusRfq.status === 'OPEN' ? (
              <span className="self-center text-xs text-slate-600">You can submit a bid from the full RFQ page.</span>
            ) : readOnly && focusRfq.status === 'OPEN' ? (
              <span className="self-center text-xs font-medium text-slate-600">Open · browse only — no bid actions for your role</span>
            ) : null}
          </div>
          {focusBids.length > 0 ? (
            <div className="mt-6 border-t border-amber-200/80 pt-4">
              <p className="text-sm font-medium text-slate-800">Bids on this RFQ (summary)</p>
              <ul className="mt-2 space-y-2 text-sm">
                {focusBids.map((bid) => {
                  const view = redactBidForRole(bid, viewerRole)
                  return (
                    <li key={bid.id} className="rounded-lg bg-white/80 px-3 py-2">
                      <span className="font-mono text-xs">{bid.id}</span> · {bid.status}
                      {view.priceHidden ? (
                        <span className="ml-2 text-slate-500">Price hidden for your role</span>
                      ) : (
                        <span className="ml-2 font-medium">${bid.price.toFixed(2)}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
