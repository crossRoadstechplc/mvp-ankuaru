'use client'

import type { ReactNode } from 'react'

import { AdminRouteGate } from '@/components/auth/admin-route-gate'

/**
 * Admin routes stay gated; primary navigation chrome lives in `AuthenticatedAppShell`.
 */
export function AdminLayoutClient({ children }: { children: ReactNode }) {
  return <AdminRouteGate>{children}</AdminRouteGate>
}
