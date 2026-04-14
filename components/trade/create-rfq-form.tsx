'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { LabResult, Lot, User } from '@/lib/domain/types'
import { useServerSnapshotRefresh } from '@/hooks/use-server-snapshot-refresh'

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
  /** Active processor/exporter/importer accounts allowed to publish RFQs. */
  publisherUsers: User[]
  lots: Lot[]
  labResults?: LabResult[]
  processedOutputLotIds?: string[]
}

export function CreateRfqForm({
  publisherUsers,
  lots,
  labResults = [],
  processedOutputLotIds = [],
}: CreateRfqFormProps) {
  const router = useRouter()
  useServerSnapshotRefresh()
  const [createdByUserId, setCreatedByUserId] = useState(publisherUsers[0]?.id ?? '')
  const [opportunityType, setOpportunityType] = useState<'RFQ' | 'IOI' | 'AUCTION'>('RFQ')
  const [credibilityMode, setCredibilityMode] = useState<'STANDARD' | 'LAB_VERIFIED' | 'LAB_TRANSPORT_VERIFIED'>(
    'STANDARD',
  )
  const [lotLabFilter, setLotLabFilter] = useState<'ALL' | 'WITH_LAB_RESULT' | 'WITHOUT_LAB_RESULT'>('ALL')
  const [sourceLotIds, setSourceLotIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState('')
  const [qualityRequirement, setQualityRequirement] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const publisherRole = publisherUsers.find((u) => u.id === createdByUserId)?.role
  const lotsWithLabResultIds = new Set(labResults.map((result) => result.lotId))
  const processedOutputIds = new Set(processedOutputLotIds)
  const processorLots = lots.filter(
    (lot) =>
      processedOutputIds.has(lot.id) &&
      lot.ownerId === createdByUserId &&
      lot.form !== 'BYPRODUCT' &&
      lot.status !== 'CLOSED',
  )
  const filteredProcessorLots = processorLots.filter((lot) => {
    if (lotLabFilter === 'WITH_LAB_RESULT') {
      return lotsWithLabResultIds.has(lot.id)
    }
    if (lotLabFilter === 'WITHOUT_LAB_RESULT') {
      return !lotsWithLabResultIds.has(lot.id)
    }
    return true
  })

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
          opportunityType,
          quantity: qty,
          qualityRequirement: qualityRequirement.trim(),
          location: location.trim(),
          notes: notes.trim() || undefined,
          sourceLotIds: sourceLotIds.length > 0 ? sourceLotIds : undefined,
          credibilityMode,
        }),
      })) as { rfq: { id: string } }
      router.push(`/discovery?created=${encodeURIComponent(res.rfq.id)}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create RFQ')
    } finally {
      setSaving(false)
    }
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
        <span className="font-medium text-slate-700">Opportunity type</span>
        <select
          value={opportunityType}
          onChange={(e) => setOpportunityType(e.target.value as 'RFQ' | 'IOI' | 'AUCTION')}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="RFQ">RFQ</option>
          <option value="IOI">IOI</option>
          <option value="AUCTION">Auction</option>
        </select>
      </label>

      {publisherRole === 'processor' ? (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-700">Source processed lots</legend>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Lot filter</span>
              <select
                value={lotLabFilter}
                onChange={(e) =>
                  setLotLabFilter(e.target.value as 'ALL' | 'WITH_LAB_RESULT' | 'WITHOUT_LAB_RESULT')
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <option value="ALL">All lots</option>
                <option value="WITH_LAB_RESULT">Lots with lab results</option>
                <option value="WITHOUT_LAB_RESULT">Lots with no lab results</option>
              </select>
            </label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {filteredProcessorLots.map((lot) => {
                const checked = sourceLotIds.includes(lot.id)
                return (
                  <label key={lot.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSourceLotIds((prev) =>
                          e.target.checked ? [...prev, lot.id] : prev.filter((id) => id !== lot.id),
                        )
                      }
                    />
                    <span>
                      {lot.publicLotCode} ({lot.id}) · {lot.weight} kg ·{' '}
                      {lotsWithLabResultIds.has(lot.id) ? 'lab attached' : 'no lab result'}
                    </span>
                  </label>
                )
              })}
              {filteredProcessorLots.length === 0 ? (
                <p className="text-sm text-slate-500">No lots match this filter.</p>
              ) : null}
            </div>
          </fieldset>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Credibility mode</span>
            <select
              value={credibilityMode}
              onChange={(e) =>
                setCredibilityMode(e.target.value as 'STANDARD' | 'LAB_VERIFIED' | 'LAB_TRANSPORT_VERIFIED')
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="STANDARD">Standard</option>
              <option value="LAB_VERIFIED">Lab verified</option>
              <option value="LAB_TRANSPORT_VERIFIED">Lab + transport verified</option>
            </select>
          </label>
        </>
      ) : null}

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
