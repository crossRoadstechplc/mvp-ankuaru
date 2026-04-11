'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import type { Lot, User } from '@/lib/domain/types'

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

export type SubmitBidFormProps = {
  rfqId: string
  /** Active exporter or importer accounts that may submit bids (stored on `Bid.bidderUserId`). */
  bidderUsers: User[]
  lots: Lot[]
}

export function SubmitBidForm({ rfqId, bidderUsers, lots }: SubmitBidFormProps) {
  const [bidderUserId, setBidderUserId] = useState(bidderUsers[0]?.id ?? '')
  const [price, setPrice] = useState('')
  const [lotIds, setLotIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const lotOptions = useMemo(() => lots.filter((l) => l.integrityStatus === 'OK'), [lots])

  const toggleLot = (id: string) => {
    setLotIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const p = Number(price)
    if (!Number.isFinite(p) || p <= 0) {
      setError('Price must be a positive number.')
      return
    }
    if (!bidderUserId) {
      setError('Select a bidder account.')
      return
    }

    setSaving(true)
    try {
      await fetchJson('/api/trade-discovery/bid', {
        method: 'POST',
        body: JSON.stringify({
          rfqId,
          bidderUserId,
          price: p,
          lotIds,
          notes: notes.trim() || undefined,
        }),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bid')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
        Bid submitted. The RFQ owner can review and select a winner when ready.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-slate-600">
        Attach one or more lots you can supply. Pricing is visible only to participants in exporter/importer discovery
        roles.
      </p>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Bidder account</span>
        <select
          value={bidderUserId}
          onChange={(e) => setBidderUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {bidderUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Unit price</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        />
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Referenced lots (optional)</legend>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
          {lotOptions.length === 0 ? (
            <p className="text-sm text-slate-500">No lots available.</p>
          ) : (
            lotOptions.map((lot) => (
              <label key={lot.id} className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={lotIds.includes(lot.id)}
                  onChange={() => toggleLot(lot.id)}
                />
                <span>
                  {lot.publicLotCode} · {lot.form} · {lot.status}
                </span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Bid notes (optional)</span>
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
        disabled={saving || bidderUsers.length === 0}
        className="rounded-full bg-sky-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Submitting…' : 'Submit bid'}
      </button>
    </form>
  )
}
