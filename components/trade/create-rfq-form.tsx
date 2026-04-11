'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import type { User } from '@/lib/domain/types'

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

export type CreateRfqFormProps = {
  /** Active exporter or importer accounts allowed to publish RFQs. */
  publisherUsers: User[]
}

export function CreateRfqForm({ publisherUsers }: CreateRfqFormProps) {
  const [createdByUserId, setCreatedByUserId] = useState(publisherUsers[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [qualityRequirement, setQualityRequirement] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be a positive number.')
      return
    }
    if (!createdByUserId) {
      setError('Choose an account.')
      return
    }

    setSaving(true)
    try {
      const res = (await fetchJson('/api/trade-discovery/rfq', {
        method: 'POST',
        body: JSON.stringify({
          createdByUserId,
          quantity: qty,
          qualityRequirement: qualityRequirement.trim(),
          location: location.trim(),
          notes: notes.trim() || undefined,
        }),
      })) as { rfq: { id: string } }
      setDone(res.rfq.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create RFQ')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
        RFQ created. Reference <span className="font-mono font-semibold">{done}</span>. Counterparties can respond from
        Discovery or the RFQ list.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Publish as</span>
        <select
          value={createdByUserId}
          onChange={(e) => setCreatedByUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {publisherUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.id})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Desired quantity (kg)</span>
        <input
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Quality requirement</span>
        <textarea
          value={qualityRequirement}
          onChange={(e) => setQualityRequirement(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Location</span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || publisherUsers.length === 0}
        className="rounded-full bg-amber-800 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Publishing…' : 'Publish RFQ'}
      </button>
    </form>
  )
}
