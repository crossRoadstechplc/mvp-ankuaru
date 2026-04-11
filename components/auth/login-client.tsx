'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ROLE_VALUES } from '@/lib/domain/constants'
import type { Role, User } from '@/lib/domain/types'
import { useSessionStore } from '@/store/session-store'

type EligibleUsersResponse = {
  users: User[]
}

const roleOrder = new Map<Role, number>(ROLE_VALUES.map((r, i) => [r, i]))

export function LoginClient() {
  const router = useRouter()
  const setSession = useSessionStore((s) => s.setSession)
  const [users, setUsers] = useState<User[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/auth/eligible-users', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as EligibleUsersResponse
      setUsers(data.users)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
      setUsers([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const sortedUsers = useMemo(() => {
    if (!users?.length) {
      return []
    }
    return [...users].sort((a, b) => {
      const byRole = (roleOrder.get(a.role) ?? 99) - (roleOrder.get(b.role) ?? 99)
      if (byRole !== 0) {
        return byRole
      }
      return a.name.localeCompare(b.name)
    })
  }, [users])

  const onLogin = (user: User) => {
    setSession(user.id, user.role, user.name)
    router.replace('/')
  }

  if (users === null) {
    return (
      <p className="text-center text-slate-600" role="status" data-testid="login-loading">
        Loading accounts…
      </p>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" data-testid="login-error">
        {error}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <p className="text-center text-slate-600" data-testid="login-empty">
        No eligible accounts available.
      </p>
    )
  }

  return (
    <ul
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      data-testid="login-user-list"
    >
      {sortedUsers.map((user) => (
        <li key={user.id} className="min-w-0">
          <article className="flex h-full min-h-[11rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <p className="truncate text-base font-semibold text-slate-950 sm:text-lg" title={user.name}>
                {user.name}
              </p>
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium capitalize text-amber-900">
                {user.role}
              </span>
              {user.email ? (
                <p className="line-clamp-2 break-all text-xs text-slate-600 sm:text-sm" title={user.email}>
                  {user.email}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onLogin(user)}
              className="mt-3 w-full rounded-full bg-slate-950 py-2 text-sm font-medium text-white hover:bg-slate-800"
              data-testid={`login-as-${user.id}`}
            >
              Continue
            </button>
          </article>
        </li>
      ))}
    </ul>
  )
}
