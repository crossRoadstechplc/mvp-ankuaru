'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { btnCtaVioletLgClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
import { LOT_FORM_VALUES } from '@/lib/domain/constants'
import type { Lot, LotForm, User } from '@/lib/domain/types'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'
import {
  isMassBalanced,
  sumByproductMasses,
  type ByproductMasses,
} from '@/lib/lots/processing-mass-balance'

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

const PROCESSOR_ROLES = new Set(['processor', 'admin'])

const OUTPUT_FORMS = LOT_FORM_VALUES.filter((form) => form !== 'BYPRODUCT')

const emptyByproducts = (): ByproductMasses => ({
  pulp: 0,
  husk: 0,
  parchment: 0,
  defects: 0,
  moistureLoss: 0,
})

export type ProcessLotsFormProps = {
  onSuccess?: (payload: { primaryLotId: string | null; eventId: string }) => void
  /** When set (e.g. processor workspace), ledger actor is fixed and the actor picker is hidden. */
  lockedActorId?: string
  /**
   * When true (processor wash-line UI), only lots in READY_FOR_PROCESSING appear.
   * Admin full form omits this to allow repair/demo on other operational statuses.
   */
  restrictToProcessReady?: boolean
}

const DEFAULT_ELIGIBLE_STATUSES: readonly Lot['status'][] = [
  'ACTIVE',
  'IN_PROCESSING',
  'READY_FOR_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

const PROCESSOR_PIPELINE_STATUSES: readonly Lot['status'][] = ['READY_FOR_PROCESSING']

export function ProcessLotsForm({ onSuccess, lockedActorId, restrictToProcessReady = false }: ProcessLotsFormProps) {
  const [lots, setLots] = useState<Lot[]>([])
  const [actors, setActors] = useState<User[]>([])
  const [inputLotId, setInputLotId] = useState('')
  const [inputWeight, setInputWeight] = useState('')
  const [outputWeight, setOutputWeight] = useState('')
  const [outputForm, setOutputForm] = useState<LotForm>('GREEN')
  const [processingMethod, setProcessingMethod] = useState<'washed' | 'natural'>('washed')
  const [byproducts, setByproducts] = useState<ByproductMasses>(emptyByproducts)
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
        const eligibleActors = userRows.filter((user) => user.isActive && PROCESSOR_ROLES.has(user.role))
        setActors(eligibleActors)
        if (lockedActorId) {
          const locked = eligibleActors.find((u) => u.id === lockedActorId)
          setActorId(locked?.id ?? lockedActorId)
        } else {
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
    const allow = restrictToProcessReady ? PROCESSOR_PIPELINE_STATUSES : DEFAULT_ELIGIBLE_STATUSES
    return lots.filter((lot) => allow.includes(lot.status))
  }, [lots, restrictToProcessReady])

  const sourceLot = useMemo(() => lots.find((lot) => lot.id === inputLotId), [lots, inputLotId])

  const parsedInput = Number(inputWeight)
  const parsedOutput = Number(outputWeight)
  const clientBalanced = useMemo(() => {
    if (!Number.isFinite(parsedInput) || !Number.isFinite(parsedOutput)) {
      return null
    }
    return isMassBalanced(parsedInput, parsedOutput, byproducts)
  }, [parsedInput, parsedOutput, byproducts])

  const totalOutPreview =
    Number.isFinite(parsedOutput) ? parsedOutput + sumByproductMasses(byproducts) : null

  const setBp = (key: keyof ByproductMasses, value: string) => {
    const n = Number(value)
    setByproducts((prev) => ({
      ...prev,
      [key]: Number.isFinite(n) && n >= 0 ? n : 0,
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    const iw = Number(inputWeight)
    const ow = Number(outputWeight)

    if (!inputLotId) {
      setError('Select an input lot.')
      return
    }
    if (!Number.isFinite(iw) || iw <= 0) {
      setError('Enter a positive input weight (kg).')
      return
    }
    if (!Number.isFinite(ow) || ow < 0) {
      setError('Output weight must be a non-negative number.')
      return
    }
    if (!actorId && !lockedActorId) {
      setError('Select an actor.')
      return
    }
    if (!isMassBalanced(iw, ow, byproducts)) {
      setError(
        'Mass balance does not close: input weight must equal main output plus all byproduct streams (pulp, husk, parchment, defects, moisture loss).',
      )
      return
    }
    if (ow <= 0 && sumByproductMasses(byproducts) <= 0) {
      setError('Enter a positive main output or at least one byproduct mass.')
      return
    }

    setSaving(true)
    try {
      const data = (await fetchJson('/api/lots/process', {
        method: 'POST',
        body: JSON.stringify({
          inputLotId,
          inputWeight: iw,
          outputWeight: ow,
          outputForm,
          processingMethod,
          byproducts,
          actorId: lockedActorId ?? actorId,
        }),
      })) as { primaryLot: { id: string; publicLotCode?: string } | null; event: { id: string } }
      showAppToast('Processing run recorded on the ledger.')
      onSuccess?.({ primaryLotId: data.primaryLot?.id ?? null, eventId: data.event.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading lots…</p>
  }

  if (restrictToProcessReady && eligibleLots.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950">
        <p className="font-medium">No lots in READY_FOR_PROCESSING</p>
        <p className="leading-relaxed">
          Aggregated output lots are created in that state. If the queue is empty, create an aggregation first (aggregator
          workflow) or ask an admin to adjust snapshots.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {restrictToProcessReady ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 text-sm text-violet-950">
          <p className="font-medium">Wash-line mode</p>
          <p className="mt-2 leading-relaxed text-violet-900/95">
            Only lots in <strong>READY_FOR_PROCESSING</strong> are listed — the handoff state after aggregation (or an
            admin release). Use <strong>Admin → Lots → Process</strong> if you need to record against other statuses.
          </p>
        </div>
      ) : null}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Processing method</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pm"
              checked={processingMethod === 'washed'}
              onChange={() => setProcessingMethod('washed')}
            />
            Washed
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pm"
              checked={processingMethod === 'natural'}
              onChange={() => setProcessingMethod('natural')}
            />
            Natural
          </label>
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Input lot</span>
        <select
          value={inputLotId}
          onChange={(e) => setInputLotId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select…</option>
          {eligibleLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.publicLotCode} — ID {lot.id} — {lot.weight} kg ({lot.form}) · {lot.status} ·{' '}
              {formatDisplayTimestamp(lot.updatedAt)}
            </option>
          ))}
        </select>
      </label>

      {sourceLot ? (
        <p className="text-sm text-slate-600">
          Selected lot: <strong>{sourceLot.publicLotCode}</strong> (<span className="font-mono">{sourceLot.id}</span>) ·
          available on snapshot: <strong> {sourceLot.weight} kg</strong>. Input weight cannot exceed this.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Input weight (kg)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={inputWeight}
            onChange={(e) => setInputWeight(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Main output weight (kg)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={outputWeight}
            onChange={(e) => setOutputWeight(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Resulting product form</span>
        <select
          value={outputForm}
          onChange={(e) => setOutputForm(e.target.value as LotForm)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        >
          {OUTPUT_FORMS.map((form) => (
            <option key={form} value={form}>
              {form}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Byproducts (kg)</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['pulp', 'Pulp'],
              ['husk', 'Husk'],
              ['parchment', 'Parchment'],
              ['defects', 'Defects'],
              ['moistureLoss', 'Moisture loss'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-slate-600">{label}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={String(byproducts[key])}
                onChange={(e) => setBp(key, e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2"
              />
            </label>
          ))}
        </div>
      </div>

      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          clientBalanced === false
            ? 'border-amber-400 bg-amber-50 text-amber-950'
            : clientBalanced === true
              ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        <p className="font-medium">Mass balance preview</p>
        <p className="mt-1">
          Input: {Number.isFinite(parsedInput) ? `${parsedInput} kg` : '—'} · Total out (main + byproducts):{' '}
          {totalOutPreview !== null && Number.isFinite(parsedOutput) ? `${totalOutPreview.toFixed(4)} kg` : '—'}
        </p>
        {clientBalanced === false ? (
          <p className="mt-2 font-medium">Adjust figures so input equals output plus all byproduct masses.</p>
        ) : null}
        {clientBalanced === true ? <p className="mt-2">Ready to submit — totals match.</p> : null}
      </div>

      {lockedActorId ? (
        <p className="text-sm text-slate-600">
          Recording as processor: <span className="font-medium text-slate-900">{actors.find((u) => u.id === actorId)?.name ?? actorId}</span>
        </p>
      ) : (
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
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving || clientBalanced === false}
        className={btnCtaVioletLgClass}
      >
        {saving ? 'Recording…' : 'Record processing'}
      </button>
    </form>
  )
}
