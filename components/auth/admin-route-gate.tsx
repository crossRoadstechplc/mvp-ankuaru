'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useSessionHydrated } from '@/components/auth/use-session-hydrated'
import { useSessionStore } from '@/store/session-store'

type Props = {
  children: React.ReactNode
}

/**
 * Ensures `/admin` UI is only reachable for authenticated admin-role sessions.
 * (All app routes already require login via SessionGate.)
 */
export function AdminRouteGate({ children }: Props) {
  const router = useRouter()
  const hydrated = useSessionHydrated()
  const role = useSessionStore((s) => s.currentUserRole)
  const userId = useSessionStore((s) => s.currentUserId)

  useEffect(() => {
    if (!hydrated || !userId) {
      return
    }
    if (role !== 'admin') {
      router.replace('/')
    }
  }, [hydrated, role, router, userId])

  if (!hydrated) {
    return (
      <div
        className="flex min-h-[40vh] w-full items-center justify-center text-sm text-slate-600"
        data-testid="admin-gate-hydrating"
      >
        Loading…
      </div>
    )
  }

  if (!userId || role !== 'admin') {
    return (
      <div
        className="flex min-h-[40vh] w-full items-center justify-center text-sm text-slate-600"
        data-testid="admin-gate-redirecting"
      >
        Redirecting…
      </div>
    )
  }

  return <>{children}</>
}
