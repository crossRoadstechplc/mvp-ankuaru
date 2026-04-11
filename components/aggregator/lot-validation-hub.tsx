'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import type { Lot } from '@/lib/domain/types'
import { lotIsFarmerOriginHeldAtFarm } from '@/lib/lots/lot-validation-gates'

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
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
  const [lots, setLots] = useState<Lot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const rows = (await fetchJson('/api/lots')) as Lot[]
        if (!cancelled) {
          setLots(rows)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load lots')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const { awaiting, validated, rejected } = useMemo(() => farmerOriginBuckets(lots), [lots])

  if (loading) {
    return <p className="text-sm text-slate-600">Loading lots…</p>
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>
  }

  return (
    <div className="space-y-10">
      <p className="text-sm leading-6 text-slate-600">
        Farmer-picked lots start as <strong>PENDING</strong>. Record observed weight, notes, then approve or reject.
        Only <strong>VALIDATED</strong> lots appear in the aggregation picker (with integrity OK and eligible status).
      </p>

      <section id="awaiting" className="scroll-mt-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Awaiting validation</h2>
        <p className="mt-1 text-sm text-slate-600">{awaiting.length} farmer-held lot(s)</p>
        {awaiting.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">None right now.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {awaiting.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </section>

      <section id="validated" className="scroll-mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Validated lots</h2>
        <p className="mt-1 text-sm text-slate-600">{validated.length} cleared for aggregation</p>
        {validated.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">None yet.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {validated.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </section>

      <section id="rejected" className="scroll-mt-8 rounded-2xl border border-rose-200 bg-rose-50/40 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-950">Rejected lots</h2>
        <p className="mt-1 text-sm text-slate-600">Not eligible for aggregation</p>
        {rejected.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">None.</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {rejected.map((lot) => (
              <LotRow key={lot.id} lot={lot} />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
