'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useUiStore } from '@/store/ui-store'
import { useSessionStore } from '@/store/session-store'

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'

import { MockSessionFetchBridge } from './mock-session-fetch-bridge'
import { useSessionHydrated } from './use-session-hydrated'

const PUBLIC_PREFIXES = ['/login']

/** Compact routes (e.g. iframe role preview) — no app shell or top chrome. */
const EMBEDDED_PREFIXES = ['/role-preview']

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
      <header className="w-full shrink-0 border-b border-slate-200 bg-white">
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
