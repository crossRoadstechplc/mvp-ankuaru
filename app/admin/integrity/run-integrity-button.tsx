'use client'

import { useState } from 'react'

type Props = {
  /** POST /api/integrity/run — optional header for tests / multi-root workspaces */
  projectRootHeader?: string
}

export function RunIntegrityButton({ projectRootHeader }: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (apply: boolean) => {
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/integrity/run', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(projectRootHeader ? { 'x-ankuaru-project-root': projectRootHeader } : {}),
        },
        body: JSON.stringify({ apply }),
      })
      const data = (await res.json()) as { error?: string; issueCount?: number; eventsAppended?: number }
      if (!res.ok) {
        setError(data.error ?? 'Request failed')
        return
      }
      setMessage(
        `Scan complete (${apply ? 'applied' : 'dry run'}): ${data.issueCount ?? 0} lot(s) with issues; ${data.eventsAppended ?? 0} integrity event(s) appended.`,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(true)}
          className="rounded-full border border-rose-200 bg-rose-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Running…' : 'Run integrity checks (apply)'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(false)}
          className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-800 disabled:opacity-50"
        >
          Dry run (no quarantine writes)
        </button>
      </div>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  )
}
