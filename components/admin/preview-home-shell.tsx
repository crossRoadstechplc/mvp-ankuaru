'use client'

import { useEffect } from 'react'

import { HomeDashboard } from '@/components/home-dashboard'
import type { LiveDataStore } from '@/lib/domain/types'
import type { Role } from '@/lib/domain/types'
import { useUiStore } from '@/store/ui-store'

type Props = {
  store: LiveDataStore
  initialRole: Role
  initialUserId: string | null
}

/**
 * Applies role/user selection for an isolated iframe preview without mutating other tabs.
 */
export function PreviewHomeShell({ store, initialRole, initialUserId }: Props) {
  const setSelectedRole = useUiStore((s) => s.setSelectedRole)
  const setSelectedUserId = useUiStore((s) => s.setSelectedUserId)

  useEffect(() => {
    setSelectedRole(initialRole)
    setSelectedUserId(initialUserId)
  }, [initialRole, initialUserId, setSelectedRole, setSelectedUserId])

  return (
    <div data-testid="preview-home-shell" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,243,199,0.35),_transparent_55%)]">
      <div className="border-b border-amber-200/80 bg-amber-50/90 px-4 py-2 text-center text-xs font-medium text-amber-950">
        Preview session — changes here do not affect your main workspace unless you share the same preview id.
      </div>
      <HomeDashboard store={store} />
    </div>
  )
}
