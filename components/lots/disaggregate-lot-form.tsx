'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { btnCtaSkyAltLgClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
import { LOT_FORM_VALUES } from '@/lib/domain/constants'
import type { Lot, LotForm, User } from '@/lib/domain/types'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'

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

type OutputRow = {
  id: string
  weight: string
  form: LotForm
}

const newRow = (): OutputRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  weight: '',
  form: 'CHERRY',
})

export type DisaggregateLotFormProps = {
  onSuccess?: (payload: { sourceLotId: string; childLotIds: string[] }) => void
}

export function DisaggregateLotForm({ onSuccess }: DisaggregateLotFormProps) {
  const [lots, setLots] = useState<Lot[]>([])
  const [actors, setActors] = useState<User[]>([])
  const [sourceLotId, setSourceLotId] = useState('')
  const [rows, setRows] = useState<OutputRow[]>(() => [newRow(), newRow()])
  const [actorId, setActorId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [lotRows, userRows] = await Promise.all([
          fetchJson('/api/lots') as Promise<Lot[]>,
          fetchJson('/api/users') as Promise<User[]>,
        ])
        if (cancelled) {
          return
        }
        setLots(lotRows)
        const eligibleActors = userRows.filter((user) => user.isActive && ACTOR_ROLES.has(user.role))
        setActors(eligibleActors)
        setActorId(eligibleActors[0]?.id ?? '')
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
  }, [])

  const eligibleLots = useMemo(
    () =>
      lots.filter((lot) =>
        ['ACTIVE', 'IN_PROCESSING', 'IN_TRANSIT', 'AT_LAB', 'READY_FOR_EXPORT'].includes(lot.status),
      ),
    [lots],
  )

  const sourceLot = useMemo(() => lots.find((lot) => lot.id === sourceLotId), [lots, sourceLotId])

  const updateRow = (id: string, patch: Partial<OutputRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  const addRow = () => setRows((prev) => [...prev, newRow()])
  const removeRow = (id: string) => setRows((prev) => (prev.length <= 2 ? prev : prev.filter((row) => row.id !== id)))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!sourceLotId) {
      setError('Select a source lot.')
      return
    }
    if (!actorId) {
      setError('Select an actor.')
      return
    }

    const outputs = rows.map((row) => {
      const weight = Number(row.weight)
      return { weight, form: row.form }
    })

    for (const row of outputs) {
      if (!Number.isFinite(row.weight) || row.weight <= 0) {
        setError('Each child row needs a positive weight.')
        return
      }
    }

    setSaving(true)
    try {
      const data = (await fetchJson('/api/lots/disaggregate', {
        method: 'POST',
        body: JSON.stringify({
          sourceLotId,
          outputs,
          actorId,
        }),
      })) as { childLots: { id: string }[]; sourceLot: { id: string } }
      showAppToast(`Disaggregation saved: ${data.childLots.length} child lot(s) created.`)
      onSuccess?.({
        sourceLotId: data.sourceLot.id,
        childLotIds: data.childLots.map((lot) => lot.id),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disaggregation failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading lots…</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Source lot</span>
        <select
          value={sourceLotId}
          onChange={(e) => setSourceLotId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select…</option>
          {eligibleLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.publicLotCode} — {lot.weight} kg ({lot.form}) · {formatDisplayTimestamp(lot.updatedAt)}
            </option>
          ))}
        </select>
      </label>

      {sourceLot ? (
        <p className="text-sm text-slate-600">
          Source weight: <strong>{sourceLot.weight} kg</strong>. Child weights must sum to at most this amount.
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Child lots (two or more)</p>
          <button
            type="button"
            onClick={addRow}
            className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
          >
            Add row
          </button>
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="min-w-[120px] flex-1 text-sm">
                <span className="font-medium text-slate-700">Weight (kg)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.weight}
                  onChange={(e) => updateRow(row.id, { weight: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                  required
                />
              </label>
              <label className="min-w-[140px] flex-1 text-sm">
                <span className="font-medium text-slate-700">Form</span>
                <select
                  value={row.form}
                  onChange={(e) => updateRow(row.id, { form: e.target.value as LotForm })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  {LOT_FORM_VALUES.map((form) => (
                    <option key={form} value={form}>
                      {form}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-40"
                disabled={rows.length <= 2}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Actor (ledger)</span>
        <select
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

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className={btnCtaSkyAltLgClass}
      >
        {saving ? 'Splitting…' : 'Create child lots'}
      </button>
    </form>
  )
}
