'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { LoginBankStatusRibbon } from '@/components/auth/login-bank-status-ribbon'
import { btnCtaAmberClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
import { ROLE_VALUES } from '@/lib/domain/constants'
import type { BankReview, Role, User } from '@/lib/domain/types'
import { isBankApprovedUser } from '@/lib/trade-discovery/bank-approval'
import { useSessionStore } from '@/store/session-store'

type EligibleUsersResponse = {
  users: User[]
}

const BANK_RELEVANT_ROLES = new Set<Role>(['processor', 'exporter', 'importer'])

const roleOrder = new Map<Role, number>(ROLE_VALUES.map((r, i) => [r, i]))

export function LoginClient() {
  const router = useRouter()
  const setSession = useSessionStore((s) => s.setSession)
  const [users, setUsers] = useState<User[] | null>(null)
  const [bankReviews, setBankReviews] = useState<BankReview[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [usersRes, bankReviewsRes] = await Promise.all([
        fetch('/api/auth/eligible-users', { cache: 'no-store' }),
        fetch('/api/bankReviews', { cache: 'no-store' }),
      ])
      if (!usersRes.ok) {
        throw new Error(`HTTP ${usersRes.status}`)
      }
      const data = (await usersRes.json()) as EligibleUsersResponse
      setUsers(data.users)
      if (bankReviewsRes.ok) {
        const reviews = (await bankReviewsRes.json()) as BankReview[]
        setBankReviews(reviews)
      } else {
        setBankReviews([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users')
      setUsers([])
      setBankReviews([])
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
    showAppToast(`Signed in as ${user.name}.`)
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
      className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      data-testid="login-user-list"
    >
      {sortedUsers.map((user) => (
        <li key={user.id} className="min-w-0">
          <article className="group relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 pt-7 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/60">
            {BANK_RELEVANT_ROLES.has(user.role) ? (
              <LoginBankStatusRibbon approved={isBankApprovedUser(user.id, bankReviews)} />
            ) : null}
            <div className="flex min-h-0 flex-1 flex-col gap-2.5">
              <p className="truncate text-base font-semibold text-slate-950 sm:text-lg" title={user.name}>
                {user.name}
              </p>
              <span className="inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium capitalize text-amber-900">
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
              className={`${btnCtaAmberClass} mt-4 w-full`}
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
