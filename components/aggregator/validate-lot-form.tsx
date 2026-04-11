'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

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

export type ValidateLotFormProps = {
  lot: Lot
  actorId: string
  onSuccess?: (lot: Lot) => void
}

export function ValidateLotForm({ lot, actorId, onSuccess }: ValidateLotFormProps) {
  const [observedWeight, setObservedWeight] = useState(
    lot.observedWeight !== undefined ? String(lot.observedWeight) : String(lot.weight),
  )
  const [notes, setNotes] = useState(lot.validationNotes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applicable = useMemo(
    () => lotIsFarmerOriginHeldAtFarm(lot) && lot.validationStatus === 'PENDING',
    [lot],
  )

  const submit = async (decision: 'VALIDATED' | 'REJECTED') => {
    setError(null)
    const kg = Number(observedWeight)
    if (!Number.isFinite(kg) || kg <= 0) {
      setError('Enter a positive observed weight (kg).')
      return
    }
    setSaving(true)
    try {
      const data = (await fetchJson('/api/lots/validate', {
        method: 'POST',
        body: JSON.stringify({
          lotId: lot.id,
          actorId,
          decision,
          observedWeight: kg,
          validationNotes: notes.trim() || undefined,
        }),
      })) as { lot: Lot }
      onSuccess?.(data.lot)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
  }

  if (!lotIsFarmerOriginHeldAtFarm(lot)) {
    return (
      <p className="text-sm text-slate-600">
        This lot is not a farmer-held origin lot; aggregator validation does not apply.
      </p>
    )
  }

  if (lot.validationStatus === 'VALIDATED') {
    return (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          <strong>Validated</strong> at {lot.validatedAt ?? '—'} (observed {lot.observedWeight ?? lot.weight} kg).
        </p>
        {lot.validationNotes ? <p className="text-slate-600">Notes: {lot.validationNotes}</p> : null}
      </div>
    )
  }

  if (lot.validationStatus === 'REJECTED') {
    return (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          <strong>Rejected</strong> at {lot.validatedAt ?? '—'}. Declared {lot.weight} kg, observed {lot.observedWeight ?? '—'}{' '}
          kg.
        </p>
        {lot.validationNotes ? <p className="text-slate-600">Notes: {lot.validationNotes}</p> : null}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
        <p>
          <span className="font-medium text-slate-900">Farmer-declared weight:</span>{' '}
          <span className="font-mono">{lot.weight} kg</span>
        </p>
        <p className="mt-2 text-slate-600">
          Compare with your physical check, then record observed weight and approve or reject.
        </p>
      </div>

      <label className="block text-sm" htmlFor="observed-weight">
        <span className="font-medium text-slate-700">Observed weight (kg)</span>
        <input
          id="observed-weight"
          type="number"
          min={0}
          step="0.01"
          required
          value={observedWeight}
          onChange={(e) => setObservedWeight(e.target.value)}
          className="mt-2 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="block text-sm" htmlFor="validation-notes">
        <span className="font-medium text-slate-700">Notes (optional)</span>
        <textarea
          id="validation-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || !applicable}
          onClick={() => void submit('VALIDATED')}
          className="rounded-full bg-emerald-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Approve (validated)'}
        </button>
        <button
          type="button"
          disabled={saving || !applicable}
          onClick={() => void submit('REJECTED')}
          className="rounded-full border border-rose-300 bg-white px-5 py-2 text-sm font-semibold text-rose-900 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Reject'}
        </button>
      </div>
    </form>
  )
}
