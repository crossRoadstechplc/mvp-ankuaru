'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'

import type { Field } from '@/lib/domain/types'
import { showAppToast } from '@/lib/client/app-toast'

export type FarmerLotCreationFormProps = {
  farmerUserId: string
  fields: Field[]
  onCreated?: (lotId: string) => void
}

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

export function FarmerLotCreationForm({ farmerUserId, fields, onCreated }: FarmerLotCreationFormProps) {
  const selectableFields = useMemo(
    () => fields.filter((field) => field.farmerId === farmerUserId),
    [fields, farmerUserId],
  )

  const [fieldId, setFieldId] = useState(selectableFields[0]?.id ?? '')
  const [weight, setWeight] = useState('')
  const [harvestDate, setHarvestDate] = useState('')
  const [variety, setVariety] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const kg = Number(weight)
    if (!fieldId) {
      setError('Select a field.')
      return
    }
    if (!Number.isFinite(kg) || kg < 1 || !Number.isInteger(kg)) {
      setError('Enter a whole number of kg (1 or more).')
      return
    }

    const harvestMetadata: Record<string, string> = {}
    if (harvestDate.trim()) {
      harvestMetadata.harvestDate = harvestDate.trim()
    }
    if (variety.trim()) {
      harvestMetadata.variety = variety.trim()
    }
    if (notes.trim()) {
      harvestMetadata.notes = notes.trim()
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        farmerId: farmerUserId,
        fieldId,
        weight: kg,
      }
      if (Object.keys(harvestMetadata).length > 0) {
        payload.harvestMetadata = harvestMetadata
      }

      const result = (await fetchJson('/api/farmer/lots', {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as { lot: { id: string; publicLotCode?: string } }

      showAppToast(
        result.lot.publicLotCode
          ? `Pick recorded: ${result.lot.publicLotCode} is now on the ledger.`
          : 'Pick recorded and added to the ledger.',
      )
      onCreated?.(result.lot.id)
      setWeight('')
      setHarvestDate('')
      setVariety('')
      setNotes('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      setError(msg)
      showAppToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (selectableFields.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        No fields are registered for this farmer yet. Create a field first in{' '}
        <a className="font-medium underline" href="/farmer/fields">
          Field management
        </a>
        .
      </div>
    )
  }

  return (
    <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
      <label className="block text-sm font-medium text-slate-700">
        Field
        <select
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
          value={fieldId}
          onChange={(e) => setFieldId(e.target.value)}
        >
          {selectableFields.map((field) => (
            <option key={field.id} value={field.id}>
              {field.name} ({field.id})
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm font-medium text-slate-700">
        Pick quantity (kg)
        <input
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g. 1250"
          required
        />
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Harvest metadata (optional)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-600">
            Harvest date
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              placeholder="2026-04-10"
            />
          </label>
          <label className="block text-xs font-medium text-slate-600">
            Variety
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={variety}
              onChange={(e) => setVariety(e.target.value)}
              placeholder="Heirloom local"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-medium text-slate-600">
          Notes
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Weather, crew, drying notes…"
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? 'Creating…' : 'Create pick & record PICK'}
      </button>
    </form>
  )
}
