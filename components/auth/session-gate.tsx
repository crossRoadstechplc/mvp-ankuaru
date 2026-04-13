'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import type { BankReview, Role } from '@/lib/domain/types'
import { isBankApprovedUser } from '@/lib/trade-discovery/bank-approval'
import { useUiStore } from '@/store/ui-store'
import { useSessionStore } from '@/store/session-store'

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'

import { MockSessionFetchBridge } from './mock-session-fetch-bridge'
import { useSessionHydrated } from './use-session-hydrated'

const PUBLIC_PREFIXES = ['/login']

/** Compact routes (e.g. iframe role preview) — no app shell or top chrome. */
const EMBEDDED_PREFIXES = ['/role-preview']
const BANK_RELEVANT_ROLES = new Set<Role>(['processor', 'exporter', 'importer'])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function isEmbeddedPath(pathname: string): boolean {
  return EMBEDDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function SessionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const hydrated = useSessionHydrated()
  const currentUserId = useSessionStore((s) => s.currentUserId)
  const currentUserName = useSessionStore((s) => s.currentUserName)
  const currentUserRole = useSessionStore((s) => s.currentUserRole)
  const logoutSession = useSessionStore((s) => s.logout)
  const [bankReviews, setBankReviews] = useState<BankReview[]>([])

  const publicRoute = isPublicPath(pathname)

  useEffect(() => {
    if (!hydrated) {
      return
    }
    if (publicRoute) {
      if (currentUserId) {
        router.replace('/')
      }
      return
    }
    if (!currentUserId) {
      router.replace('/login')
    }
  }, [hydrated, publicRoute, currentUserId, router])

  useEffect(() => {
    let cancelled = false
    if (!currentUserId || !currentUserRole || !BANK_RELEVANT_ROLES.has(currentUserRole)) {
      setBankReviews([])
      return () => {
        cancelled = true
      }
    }
    void fetch('/api/bankReviews', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok || cancelled) return
        const data = (await res.json()) as BankReview[]
        if (!cancelled) setBankReviews(data)
      })
      .catch(() => {
        if (!cancelled) setBankReviews([])
      })
    return () => {
      cancelled = true
    }
  }, [currentUserId, currentUserRole])

  const bankApproval = useMemo(() => {
    if (!currentUserId || !currentUserRole || !BANK_RELEVANT_ROLES.has(currentUserRole)) {
      return null
    }
    return isBankApprovedUser(currentUserId, bankReviews)
  }, [currentUserId, currentUserRole, bankReviews])

  const handleLogout = () => {
    logoutSession()
    useUiStore.getState().resetUiState()
    router.push('/login')
  }

  if (!hydrated) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"
        role="status"
        data-testid="session-hydrating"
      >
        Loading session…
      </div>
    )
  }

  if (publicRoute) {
    return <>{children}</>
  }

  if (!currentUserId) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600"
        role="status"
        data-testid="session-redirecting"
      >
        Redirecting to login…
      </div>
    )
  }

  if (pathname && isEmbeddedPath(pathname)) {
    return (
      <div className="min-h-screen bg-white">
        <MockSessionFetchBridge />
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50" data-testid="authenticated-root">
      <MockSessionFetchBridge />
      <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-slate-700">
            Signed in as{' '}
            <strong className="font-medium text-slate-950" data-testid="session-user-label">
              {currentUserName ?? currentUserId}
            </strong>
            {currentUserRole ? (
              <>
                {' '}
                <span className="text-slate-500">·</span>{' '}
                <span className="capitalize text-slate-600" data-testid="session-role-label">
                  {currentUserRole}
                </span>
              </>
            ) : null}
            {bankApproval !== null ? (
              <>
                {' '}
                <span className="text-slate-500">·</span>{' '}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    bankApproval ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                  }`}
                >
                  {bankApproval ? 'Bank approved' : 'Bank approval required'}
                </span>
              </>
            ) : null}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
            data-testid="logout-button"
          >
            Log out
          </button>
        </div>
      </header>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </div>
  )
}
