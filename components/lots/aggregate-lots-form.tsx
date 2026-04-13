'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { LOT_FORM_VALUES } from '@/lib/domain/constants'
import type { Lot, User } from '@/lib/domain/types'
import { lotEligibleForAggregationPicker } from '@/lib/lots/lot-validation-gates'

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

const ACTOR_ROLES = new Set(['aggregator', 'processor', 'admin'])

/** Excludes READY_FOR_PROCESSING (wash-line queue — not re-aggregated in MVP). */
const LOT_STATUSES_FOR_AGGREGATION: readonly Lot['status'][] = [
  'ACTIVE',
  'IN_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

const lotStatusOkForAggregation = (lot: Lot): boolean => LOT_STATUSES_FOR_AGGREGATION.includes(lot.status)

export type AggregateLotsFormProps = {
  onSuccess?: (lotId: string) => void
  /** When set, actor is fixed and only lots this user owns or custodies are listed (aggregator workspace). */
  lockedActorId?: string
  /**
   * When true with lockedActorId (aggregator workspace), also list farmer-origin lots still at the farm
   * so they match API rules in `lot-transformation`.
   */
  includeFarmerOriginLots?: boolean
}

const lotIsFarmerOriginForAggregatorList = (lot: Lot): boolean =>
  Boolean(lot.farmerId) && lot.ownerRole === 'farmer' && lot.custodianRole === 'farmer'

const farmerOriginAwaitingValidation = (lot: Lot): boolean =>
  lotIsFarmerOriginForAggregatorList(lot) && lot.validationStatus === 'PENDING'

export function AggregateLotsForm({ onSuccess, lockedActorId, includeFarmerOriginLots = false }: AggregateLotsFormProps) {
  const [lots, setLots] = useState<Lot[]>([])
  const [actors, setActors] = useState<User[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [outputWeight, setOutputWeight] = useState('')
  const [outputForm, setOutputForm] = useState<(typeof LOT_FORM_VALUES)[number]>('CHERRY')
  const [actorId, setActorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const lotRows = (await fetchJson('/api/lots')) as Lot[]
        if (cancelled) {
          return
        }
        setLots(lotRows)
        if (lockedActorId) {
          setActors([])
          setActorId(lockedActorId)
        } else {
          const userRows = (await fetchJson('/api/users')) as User[]
          if (cancelled) {
            return
          }
          const eligibleActors = userRows.filter((user) => user.isActive && ACTOR_ROLES.has(user.role))
          setActors(eligibleActors)
          setActorId(eligibleActors[0]?.id ?? '')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load data')
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
  }, [lockedActorId])

  const eligibleLots = useMemo(() => {
    const base = lots.filter((lot) => lotStatusOkForAggregation(lot) && lotEligibleForAggregationPicker(lot))
    if (!lockedActorId) {
      return base
    }
    return base.filter((lot) => {
      if (lot.childLotIds.length > 0) {
        return false
      }
      if (lot.custodianId === lockedActorId || lot.ownerId === lockedActorId) {
        return true
      }
      if (includeFarmerOriginLots && lotIsFarmerOriginForAggregatorList(lot)) {
        return true
      }
      return false
    })
  }, [lots, lockedActorId, includeFarmerOriginLots])

  const selectedWeightTotal = useMemo(
    () =>
      eligibleLots
        .filter((lot) => selected.has(lot.id))
        .reduce((sum, lot) => sum + lot.weight, 0),
    [eligibleLots, selected],
  )

  useEffect(() => {
    if (selected.size === 0) {
      setOutputWeight('')
      return
    }
    setOutputWeight(String(selectedWeightTotal))
  }, [selectedWeightTotal, selected.size])

  const farmerPendingValidationCount = useMemo(() => {
    if (!lockedActorId || !includeFarmerOriginLots) {
      return 0
    }
    return lots.filter(
      (lot) => lotStatusOkForAggregation(lot) && farmerOriginAwaitingValidation(lot),
    ).length
  }, [lots, lockedActorId, includeFarmerOriginLots])

  /** Active lots the locked user still cannot select (not in custody and not farmer-origin when that mode is off). */
  const otherHeldActiveCount = useMemo(() => {
    if (!lockedActorId) {
      return 0
    }
    return lots.filter((lot) => {
      if (!lotStatusOkForAggregation(lot)) {
        return false
      }
      if (lot.custodianId === lockedActorId || lot.ownerId === lockedActorId) {
        return false
      }
      if (includeFarmerOriginLots && lotIsFarmerOriginForAggregatorList(lot)) {
        return false
      }
      return true
    }).length
  }, [lots, lockedActorId, includeFarmerOriginLots])

  const toggleLot = (lotId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(lotId)) {
        next.delete(lotId)
      } else {
        next.add(lotId)
      }
      return next
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const sourceLotIds = [...selected]
    const kg = Number(outputWeight)

    if (sourceLotIds.length < 2) {
      setError('Select at least two source lots.')
      return
    }
    if (!Number.isFinite(kg) || kg <= 0) {
      setError('Enter a positive output weight (kg).')
      return
    }
    const resolvedActorId = lockedActorId ?? actorId
    if (!resolvedActorId) {
      setError('Select an actor.')
      return
    }

    setSaving(true)
    try {
      const data = (await fetchJson('/api/lots/aggregate', {
        method: 'POST',
        body: JSON.stringify({
          sourceLotIds,
          outputWeight: kg,
          outputForm,
          actorId: resolvedActorId,
        }),
      })) as { lot: { id: string } }
      onSuccess?.(data.lot.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aggregation failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading lots…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-slate-700">Source lots (select two or more)</legend>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {eligibleLots.length === 0 ? (
            <div className="space-y-3 text-sm text-slate-600">
              <p>No eligible lots found.</p>
              {lockedActorId &&
              includeFarmerOriginLots &&
              eligibleLots.length === 0 &&
              farmerPendingValidationCount > 0 ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/90 p-3 text-sky-950">
                  <p className="font-medium text-sky-950">Awaiting aggregator validation</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-950/95">
                    <strong>{farmerPendingValidationCount}</strong> farmer-origin lot
                    {farmerPendingValidationCount === 1 ? '' : 's'} must be validated (observed weight + approve) before
                    they appear here. Open <strong>Lot validation</strong> in the aggregator menu.
                  </p>
                </div>
              ) : lockedActorId && !includeFarmerOriginLots && otherHeldActiveCount > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3 text-amber-950">
                  <p className="font-medium text-amber-950">No lots you can select here</p>
                  <p className="mt-2 leading-relaxed text-amber-950/95">
                    There {otherHeldActiveCount === 1 ? 'is' : 'are'}{' '}
                    <strong>{otherHeldActiveCount}</strong> active lot
                    {otherHeldActiveCount === 1 ? '' : 's'} in the store that are not listed for this locked view. For
                    unrestricted selection, use <strong>Admin → Lots → Aggregate</strong>.
                  </p>
                </div>
              ) : lockedActorId ? (
                <p className="text-xs text-slate-500">
                  No active lots in the store, or none are assigned to you as owner or custodian yet.
                </p>
              ) : null}
            </div>
          ) : (
            eligibleLots.map((lot) => (
              <label key={lot.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={selected.has(lot.id)}
                  onChange={() => toggleLot(lot.id)}
                  className="size-4 rounded border-slate-300"
                />
                <span>
                  <span className="font-semibold text-slate-950">{lot.publicLotCode}</span>
                  <span className="text-slate-600"> — {lot.form} · {lot.weight} kg · {lot.status}</span>
                </span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm" htmlFor="aggregate-output-weight">
          <span className="font-medium text-slate-700">Output weight (kg)</span>
          <input
            id="aggregate-output-weight"
            type="number"
            min={0}
            step="0.01"
            value={outputWeight}
            onChange={(e) => setOutputWeight(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
          <span className="mt-1 block text-xs text-slate-500">
            Current selected input total: {selectedWeightTotal} kg
          </span>
        </label>
        <label className="block text-sm" htmlFor="aggregate-output-form">
          <span className="font-medium text-slate-700">Output form</span>
          <select
            id="aggregate-output-form"
            value={outputForm}
            onChange={(e) => setOutputForm(e.target.value as (typeof LOT_FORM_VALUES)[number])}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {LOT_FORM_VALUES.map((form) => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>
        </label>
      </div>

      {lockedActorId ? (
        <p className="text-sm text-slate-600">
          Ledger actor: <span className="font-mono font-medium text-slate-900">{lockedActorId}</span> (your session)
        </p>
      ) : (
        <label className="block text-sm" htmlFor="aggregate-actor">
          <span className="font-medium text-slate-700">Actor (ledger)</span>
          <select
            id="aggregate-actor"
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          >
            {actors.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role})
              </option>
            ))}
          </select>
        </label>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-amber-600 px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? 'Creating…' : 'Create aggregated lot'}
      </button>
    </form>
  )
}
