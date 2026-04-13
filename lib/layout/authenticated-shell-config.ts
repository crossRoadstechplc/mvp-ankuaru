import type { Role } from '@/lib/domain/types'
import { adminSections } from '@/lib/master-data/admin-config'
import { getRoleCapability } from '@/lib/roles/capabilities'

/** Same shape as `DashboardNavItem` in the shell — kept here to avoid lib→components imports. */
export type ShellNavItem = { href: string; label: string }

export const DISCOVERY_HREF = '/discovery'

const dedupeByHref = (items: ShellNavItem[]): ShellNavItem[] => {
  const seen = new Set<string>()
  const out: ShellNavItem[] = []
  for (const item of items) {
    if (seen.has(item.href)) {
      continue
    }
    seen.add(item.href)
    out.push(item)
  }
  return out
}

/** Ensure Discovery is present and last (requirement: all logged-in roles). */
export const ensureDiscoveryNav = (items: ShellNavItem[]): ShellNavItem[] => {
  const hasDiscovery = items.some((i) => i.href === DISCOVERY_HREF)
  const withDiscovery = hasDiscovery ? items : [...items, { href: DISCOVERY_HREF, label: 'Discovery' }]
  const rest = withDiscovery.filter((i) => i.href !== DISCOVERY_HREF)
  const discoveryLast = withDiscovery.filter((i) => i.href === DISCOVERY_HREF)
  return dedupeByHref([...rest, ...discoveryLast])
}

export const buildAdminSidebarNav = (): ShellNavItem[] =>
  ensureDiscoveryNav([
    { href: '/admin', label: 'Admin overview' },
    ...adminSections.map((s) => ({ href: s.href, label: s.label })),
  ])

type BuildRoleNavOptions = {
  /** When the signed-in user is admin, append Admin link for quick access while previewing another role. */
  appendAdminLink?: boolean
}

/**
 * Primary sidebar links for a role — sourced from `getRoleCapability` (single source of truth).
 */
export const buildRoleSidebarNav = (role: Role, options: BuildRoleNavOptions = {}): ShellNavItem[] => {
  const cap = getRoleCapability(role)
  const fromCapability: ShellNavItem[] = cap.navigation.map((n) => ({ href: n.href, label: n.label }))
  const withAdmin =
    options.appendAdminLink && !fromCapability.some((i) => i.href === '/admin')
      ? [...fromCapability, { href: '/admin', label: 'Admin' }]
      : fromCapability
  return ensureDiscoveryNav(withAdmin)
}

export type ShellWorkspace = {
  workspace: string
  workspaceHint: string
  navItems: ShellNavItem[]
}

export const resolveShellWorkspace = (
  pathname: string,
  sessionRole: Role,
  effectiveRole: Role,
): ShellWorkspace => {
  const isAdminSection = pathname.startsWith('/admin') && sessionRole === 'admin'
  if (isAdminSection) {
    return {
      workspace: 'Admin',
      workspaceHint: 'Master data, integrity, and platform tooling.',
      navItems: buildAdminSidebarNav(),
    }
  }

  const cap = getRoleCapability(effectiveRole)
  return {
    workspace: cap.label,
    workspaceHint: cap.description,
    navItems: buildRoleSidebarNav(effectiveRole, { appendAdminLink: sessionRole === 'admin' }),
  }
}

export type SectionBackContext = {
  sectionHomeHref: string
  sectionHomeLabel: string
  hideBackBar: boolean
}

/**
 * Drives the optional page chrome row (back / section jump). Sidebar already includes "Dashboard home".
 */
export const resolveSectionBackContext = (pathname: string): SectionBackContext => {
  if (pathname === '/') {
    return { sectionHomeHref: '/', sectionHomeLabel: 'Home', hideBackBar: true }
  }

  if (pathname.startsWith('/admin')) {
    return { sectionHomeHref: '/admin', sectionHomeLabel: 'Admin overview', hideBackBar: pathname === '/admin' }
  }

  if (pathname.startsWith('/trade')) {
    return { sectionHomeHref: '/trade', sectionHomeLabel: 'Trade', hideBackBar: pathname === '/trade' }
  }

  if (pathname.startsWith('/farmer')) {
    return {
      sectionHomeHref: '/farmer/fields',
      sectionHomeLabel: 'Farmer workspace',
      hideBackBar: pathname === '/farmer/fields',
    }
  }

  if (pathname.startsWith('/discovery')) {
    return { sectionHomeHref: '/discovery', sectionHomeLabel: 'Discovery', hideBackBar: pathname === '/discovery' }
  }

  if (pathname.startsWith('/actions')) {
    return { sectionHomeHref: '/', sectionHomeLabel: 'Role dashboard', hideBackBar: false }
  }

  if (pathname.startsWith('/lots')) {
    return { sectionHomeHref: '/', sectionHomeLabel: 'Role dashboard', hideBackBar: false }
  }

  if (pathname.startsWith('/bank')) {
    return { sectionHomeHref: '/bank', sectionHomeLabel: 'Bank workspace', hideBackBar: pathname === '/bank' }
  }

  if (pathname.startsWith('/transport')) {
    return {
      sectionHomeHref: '/transport',
      sectionHomeLabel: 'Transport home',
      hideBackBar: pathname === '/transport',
    }
  }

  if (pathname.startsWith('/lab')) {
    return { sectionHomeHref: '/lab', sectionHomeLabel: 'Lab dashboard', hideBackBar: pathname === '/lab' }
  }

  if (pathname.startsWith('/processor')) {
    return {
      sectionHomeHref: '/processor',
      sectionHomeLabel: 'Processor',
      hideBackBar: pathname === '/processor',
    }
  }

  if (pathname.startsWith('/importer')) {
    return { sectionHomeHref: '/importer', sectionHomeLabel: 'Importer portal', hideBackBar: pathname === '/importer' }
  }

  if (pathname.startsWith('/regulator')) {
    return {
      sectionHomeHref: '/regulator',
      sectionHomeLabel: 'Regulator overview',
      hideBackBar: pathname === '/regulator',
    }
  }

  return { sectionHomeHref: '/', sectionHomeLabel: 'Role dashboard', hideBackBar: false }
}
