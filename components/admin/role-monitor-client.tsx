'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { ROLE_VALUES } from '@/lib/domain/constants'
import type { Role, User } from '@/lib/domain/types'
import { DEFAULT_ADMIN_PREVIEW_KEY } from '@/lib/admin/preview-constants'

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const res = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

export function RoleMonitorClient() {
  const [adminKey, setAdminKey] = useState(DEFAULT_ADMIN_PREVIEW_KEY)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('farmer')
  const [userId, setUserId] = useState<string>('')
  const [users, setUsers] = useState<User[]>([])
  const [iframeKey, setIframeKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const headersForAdmin = useMemo(
    () => ({
      'content-type': 'application/json',
      'x-ankuaru-admin-preview-key': adminKey,
    }),
    [adminKey],
  )

  const loadUsers = useCallback(async (pid: string) => {
    const data = (await fetchJson('/api/live-data', {
      headers: { 'x-ankuaru-preview-id': pid },
    })) as { users: User[] }
    setUsers(data.users ?? [])
  }, [])

  const createSession = async () => {
    setError(null)
    setBusy(true)
    try {
      const data = (await fetchJson('/api/admin/preview-sessions', {
        method: 'POST',
        headers: headersForAdmin,
        body: JSON.stringify({ adminKey }),
      })) as { previewId: string }
      setPreviewId(data.previewId)
      setIframeKey((k) => k + 1)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!previewId) {
      return
    }
    void loadUsers(previewId).catch((e: unknown) =>
      setError(e instanceof Error ? e.message : 'Failed to load preview data'),
    )
  }, [previewId, loadUsers])

  useEffect(() => {
    if (!users.length) {
      return
    }
    const match = users.find((u) => u.role === role)
    if (match) {
      setUserId(match.id)
    }
  }, [role, users])

  const iframeSrc = useMemo(() => {
    if (!previewId) {
      return ''
    }
    const u = new URL('/role-preview', typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    u.searchParams.set('previewId', previewId)
    u.searchParams.set('role', role)
    if (userId) {
      u.searchParams.set('userId', userId)
    }
    return `${u.pathname}${u.search}`
  }, [previewId, role, userId])

  const reloadIframe = () => setIframeKey((k) => k + 1)

  const resetSession = async () => {
    if (!previewId) {
      return
    }
    setError(null)
    setBusy(true)
    try {
      await fetchJson(`/api/admin/preview-sessions/${encodeURIComponent(previewId)}/reset`, {
        method: 'POST',
        headers: headersForAdmin,
        body: JSON.stringify({ adminKey }),
      })
      await loadUsers(previewId)
      reloadIframe()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed')
    } finally {
      setBusy(false)
    }
  }

  const endSession = async () => {
    if (!previewId) {
      return
    }
    setBusy(true)
    try {
      await fetchJson('/api/admin/preview-sessions', {
        method: 'DELETE',
        headers: headersForAdmin,
        body: JSON.stringify({ adminKey, previewId }),
      })
      setPreviewId(null)
      setUsers([])
      setUserId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to end session')
    } finally {
      setBusy(false)
    }
  }

  const usersForRole = users.filter((u) => u.role === role)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(220px,280px)_1fr]">
      <aside className="space-y-6 rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm" data-testid="role-monitor-sidebar">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Admin preview key</label>
          <input
            type="password"
            autoComplete="off"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm"
            data-testid="admin-preview-key-input"
          />
          <p className="mt-2 text-xs text-slate-500">Required to create, reset, or destroy isolated preview stores.</p>
        </div>

        {!previewId ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void createSession()}
            className="w-full rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            data-testid="start-preview-session"
          >
            {busy ? 'Starting…' : 'Start preview session'}
          </button>
        ) : (
          <>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Preview id</p>
              <p className="mt-1 font-mono text-xs text-slate-800">{previewId}</p>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                data-testid="preview-role-select"
              >
                {ROLE_VALUES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">User (auto-login)</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                data-testid="preview-user-select"
              >
                {usersForRole.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={reloadIframe}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800"
                data-testid="reload-preview"
              >
                Reload preview
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void resetSession()}
                className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950"
                data-testid="reset-preview-session"
              >
                Reset session data
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void endSession()}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900"
                data-testid="end-preview-session"
              >
                End session
              </button>
            </div>
          </>
        )}

        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </aside>

      <section className="flex min-h-[70vh] flex-col rounded-[2rem] border border-black/10 bg-slate-50 p-4 shadow-inner" data-testid="role-monitor-preview-panel">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-slate-900">Preview</h2>
          {previewId && iframeSrc ? (
            <p className="truncate font-mono text-xs text-slate-500" title={iframeSrc}>
              {iframeSrc}
            </p>
          ) : null}
        </div>
        {previewId && iframeSrc ? (
          <iframe
            key={`${iframeKey}-${iframeSrc}`}
            title="Role preview"
            src={iframeSrc}
            className="min-h-[640px] w-full flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm"
            data-testid="role-monitor-iframe"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">
            Start a preview session to load an isolated iframe.
          </div>
        )}
      </section>
    </div>
  )
}
