'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { Event } from '@/lib/domain/types'
import { useLiveDataPoll } from '@/hooks/use-live-data-poll'
import { TRANSPORT_MUTATION_EVENT } from '@/lib/client/transport-mutation-event'
import { btnCtaOpenCompactClass, btnCtaVioletClass } from '@/components/ui/button-styles'
import { describeProcessEventFromLots } from '@/lib/roles/role-home-ledger'
import { PROCESSOR_PIPELINE_INPUT_STATUS } from '@/lib/lots/processing-eligibility'
import { useLiveDataClientStore } from '@/store/live-data-client-store'

const outputIdsFromEvents = (events: Event[]): Set<string> => {
  const ids = new Set<string>()
  for (const ev of events) {
    for (const id of ev.outputLotIds) {
      ids.add(id)
    }
  }
  return ids
}

const fetchJson = async (input: RequestInfo) => {
  const response = await fetch(input, { headers: { 'content-type': 'application/json' } })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof data === 'object' && data !== null && 'error' in data ? String((data as { error: unknown }).error) : 'Request failed')
  }
  return data
}

const EVENTS_POLL_MS = 8_000

export function ProcessorWorkspace() {
  const lots = useLiveDataClientStore((s) => s.lots)
  const lotsLoading = useLiveDataClientStore((s) => s.lotsLoading)
  const loadLots = useLiveDataClientStore((s) => s.loadLots)
  useLiveDataPoll('lots')

  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadLots({ force: true })
  }, [loadLots])

  useEffect(() => {
    let cancelled = false

    const loadEvents = async () => {
      try {
        const eventRows = (await fetchJson('/api/events')) as Event[]
        if (!cancelled) {
          setEvents(eventRows)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load events')
        }
      } finally {
        if (!cancelled) {
          setEventsLoading(false)
        }
      }
    }

    void loadEvents()

    const intervalId = window.setInterval(() => {
      void loadEvents()
    }, EVENTS_POLL_MS)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadEvents()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onTransport = () => {
      void loadEvents()
    }
    window.addEventListener(TRANSPORT_MUTATION_EVENT, onTransport)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener(TRANSPORT_MUTATION_EVENT, onTransport)
    }
  }, [])

  const awaiting = useMemo(
    () =>
      lots.filter(
        (lot) => lot.status === PROCESSOR_PIPELINE_INPUT_STATUS && lot.integrityStatus === 'OK',
      ),
    [lots],
  )

  const processEvents = useMemo(() => {
    return events
      .filter((e) => e.type === 'PROCESS')
      .slice(-12)
      .reverse()
  }, [events])

  const recentOutputs = useMemo(() => {
    const ids = outputIdsFromEvents(processEvents)
    return lots.filter((l) => ids.has(l.id) && l.form !== 'BYPRODUCT').slice(0, 8)
  }, [lots, processEvents])

  const byproductTotals = useMemo(() => {
    const ids = outputIdsFromEvents(processEvents)
    return lots.filter((l) => l.form === 'BYPRODUCT' && ids.has(l.id)).reduce((s, l) => s + l.weight, 0)
  }, [lots, processEvents])

  const loading = (lotsLoading && lots.length === 0) || eventsLoading

  if (loading) {
    return <p className="text-sm text-slate-600">Loading processor workspace…</p>
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>
  }

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Awaiting processing</h2>
        <p className="mt-1 text-sm text-slate-600">
          Lots in <strong>{PROCESSOR_PIPELINE_INPUT_STATUS}</strong> are handed off from aggregation (or an admin release)
          and are the only inputs the wash-line form lists for your role.
        </p>
        {awaiting.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No lots in queue right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-violet-100">
            {awaiting.map((lot) => (
              <li key={lot.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <span className="font-mono font-semibold text-slate-950">{lot.publicLotCode}</span>
                  <span className="ml-2 text-sm text-slate-600">
                    {lot.form} · {lot.weight} kg
                  </span>
                </div>
                <Link href="/processor/record" className={btnCtaVioletClass}>
                  Record run
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Recent processing runs</h2>
        <p className="mt-1 text-sm text-slate-600">Latest PROCESS ledger rows (newest first).</p>
        {processEvents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No runs yet.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {processEvents.map((ev) => {
              const d = describeProcessEventFromLots(lots, ev)
              return (
                <li key={ev.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-slate-500">{ev.timestamp.slice(0, 19)}Z</span>
                      <p className="mt-1 font-semibold text-slate-950">{d.title}</p>
                      <p className="text-slate-700">{d.detail}</p>
                    </div>
                    {d.href ? (
                      <Link href={d.href} className={btnCtaOpenCompactClass}>
                        {d.linkLabel}
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h2 className="text-base font-semibold text-slate-950">Main outputs (recent)</h2>
          <p className="mt-1 text-xs text-slate-600">Non-byproduct child lots from recent runs.</p>
          {recentOutputs.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">—</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {recentOutputs.map((lot) => (
                <li key={lot.id}>
                  <Link href={`/lots/${lot.id}`} className="font-mono font-medium text-emerald-900 underline-offset-2 hover:underline">
                    {lot.publicLotCode}
                  </Link>
                  <span className="text-slate-600">
                    {' '}
                    — {lot.form} · {lot.weight} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="text-base font-semibold text-slate-950">Byproducts (snapshot)</h2>
          <p className="mt-1 text-xs text-slate-600">Total kg on BYPRODUCT lots tied to recent PROCESS outputs.</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-amber-950">{byproductTotals.toFixed(2)} kg</p>
        </section>
      </div>
    </div>
  )
}
