'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Lot, User } from '@/lib/domain/types'
import { LabStatusBadge } from '@/components/labs/lab-status-badge'

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

export type LabResultFormProps = {
  lot: Pick<Lot, 'id' | 'publicLotCode' | 'labStatus' | 'status'>
  labUsers: User[]
  onSuccess?: () => void
}

export function LabResultForm({ lot, labUsers, onSuccess }: LabResultFormProps) {
  const router = useRouter()
  const [labUserId, setLabUserId] = useState(labUsers[0]?.id ?? '')
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'FAILED'>('PENDING')
  const [score, setScore] = useState('')
  const [notes, setNotes] = useState('')
  const [metadataJson, setMetadataJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!labUserId) {
      setError('Select a lab actor.')
      return
    }

    const scoreNum = score.trim() === '' ? undefined : Number(score)
    if (score.trim() !== '' && (!Number.isFinite(scoreNum) || scoreNum === undefined)) {
      setError('Score must be a number.')
      return
    }

    let metadata: Record<string, unknown> | undefined
    if (metadataJson.trim() !== '') {
      try {
        const parsed: unknown = JSON.parse(metadataJson)
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          setError('Metadata must be a JSON object.')
          return
        }
        metadata = parsed as Record<string, unknown>
      } catch {
        setError('Metadata must be valid JSON.')
        return
      }
    }

    setSaving(true)
    try {
      await fetchJson('/api/lab/results', {
        method: 'POST',
        body: JSON.stringify({
          lotId: lot.id,
          labUserId,
          status,
          score: scoreNum,
          notes: notes.trim() || undefined,
          metadata,
        }),
      })
      router.refresh()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">{lot.publicLotCode}</p>
        <p className="mt-2">
          Snapshot status: <span className="font-medium">{lot.status}</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          Current lab:
          <LabStatusBadge status={lot.labStatus} />
        </p>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Lab analyst</span>
        <select
          value={labUserId}
          onChange={(e) => setLabUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {labUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role})
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Result</legend>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {(['PENDING', 'APPROVED', 'FAILED'] as const).map((value) => (
            <label key={value} className="flex items-center gap-2">
              <input
                type="radio"
                name="labStatus"
                value={value}
                checked={status === value}
                onChange={() => setStatus(value)}
              />
              {value === 'PENDING' ? 'Pending' : value === 'APPROVED' ? 'Approved' : 'Failed'}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Cup / quality score (optional)</span>
        <input
          type="number"
          step="0.1"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="e.g. 85.5"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Defects, moisture, cup notes…"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Quality metadata (JSON object, optional)</span>
        <textarea
          value={metadataJson}
          onChange={(e) => setMetadataJson(e.target.value)}
          rows={3}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
          placeholder='{"moisturePercent": 10.8}'
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-cyan-700 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Submit lab result'}
      </button>
    </form>
  )
}
