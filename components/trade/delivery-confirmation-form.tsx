'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import { showAppToast } from '@/lib/client/app-toast'

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

export type DeliveryActorOption = { id: string; label: string }

export type DeliveryConfirmationFormProps = {
  tradeId: string
  actorOptions: DeliveryActorOption[]
  defaultWeightKg?: number
}

/**
 * Buyer/seller (or admin) confirms delivered weight, quality, notes, and optional rebate/penalty adjustment (simulator).
 */
export function DeliveryConfirmationForm({
  tradeId,
  actorOptions,
  defaultWeightKg,
}: DeliveryConfirmationFormProps) {
  const [actorUserId, setActorUserId] = useState(actorOptions[0]?.id ?? '')
  const [weight, setWeight] = useState(defaultWeightKg != null ? String(defaultWeightKg) : '')
  const [qualityOk, setQualityOk] = useState(true)
  const [notes, setNotes] = useState('')
  const [adjustment, setAdjustment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const w = Number(weight)
    if (!Number.isFinite(w) || w <= 0) {
      setError('Delivered weight must be a positive number (kg).')
      return
    }
    const adjRaw = adjustment.trim()
    const adj = adjRaw === '' ? undefined : Number(adjRaw)
    if (adjRaw !== '' && (!Number.isFinite(adj as number))) {
      setError('Adjustment must be a number (negative = rebate, positive = penalty).')
      return
    }

    setSaving(true)
    try {
      await fetchJson('/api/trade/delivery-confirm', {
        method: 'POST',
        body: JSON.stringify({
          tradeId,
          actorUserId,
          deliveredWeightKg: w,
          deliveredQualityOk: qualityOk,
          deliveryNotes: notes.trim() || undefined,
          adjustmentAmount: adj,
        }),
      })
      showAppToast('Delivery confirmation saved.')
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-teal-200 bg-teal-50/40 p-6">
      <h3 className="text-lg font-semibold text-teal-950">Confirm delivery</h3>
      <p className="text-sm text-teal-900/90">
        Records weight and quality acceptance, optional rebate or penalty adjustment, and moves the trade and linked lots
        to delivered (simulator — no logistics integration).
      </p>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Confirming as</span>
        <select
          value={actorUserId}
          onChange={(e) => setActorUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {actorOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Delivered weight (kg)</span>
        <input
          type="number"
          min={0.01}
          step={0.1}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={qualityOk}
          onChange={(e) => setQualityOk(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        <span className="font-medium text-slate-700">Quality matches contract / acceptable at receipt</span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Condition, discrepancies, warehouse reference…"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Rebate / penalty adjustment (optional)</span>
        <input
          type="number"
          step={0.01}
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Negative = rebate to buyer, positive = extra charge"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || actorOptions.length === 0}
        className="rounded-full bg-teal-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Record delivery'}
      </button>
    </form>
  )
}
