'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

import type { Role } from '@/lib/domain/types'
import { resolveSectionBackContext, resolveShellWorkspace } from '@/lib/layout/authenticated-shell-config'

import { DashboardShell } from '@/components/layout/dashboard-shell'

type Props = {
  children: ReactNode
}

/**
 * Single logged-in shell: sidebar + main + optional back row, driven by session role and route.
 * Admin preview (session admin + UI role switcher) uses `selectedRole` for non-`/admin` routes.
 */
export function AuthenticatedAppShell({ children }: Props) {
  const pathname = usePathname() ?? ''
  const sessionRole = useSessionStore((s) => s.currentUserRole)
  const sessionUserId = useSessionStore((s) => s.currentUserId)
  const selectedRole = useUiStore((s) => s.selectedRole)

  const isAdminSession = sessionRole === 'admin'
  const effectiveRole: Role | null =
    isAdminSession && selectedRole ? selectedRole : sessionRole

  if (!sessionUserId || !sessionRole || !effectiveRole) {
    return <>{children}</>
  }

  const { workspace, workspaceHint, navItems } = resolveShellWorkspace(pathname, sessionRole, effectiveRole)
  const { sectionHomeHref, sectionHomeLabel, hideBackBar } = resolveSectionBackContext(pathname)

  return (
    <DashboardShell
      workspace={workspace}
      workspaceHint={workspaceHint}
      navItems={navItems}
      sectionHomeHref={sectionHomeHref}
      sectionHomeLabel={sectionHomeLabel}
      hideBackBar={hideBackBar}
    >
      {children}
    </DashboardShell>
  )
}
