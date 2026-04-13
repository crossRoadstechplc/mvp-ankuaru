import { describe, expect, it } from 'vitest'

import {
  buildAdminSidebarNav,
  buildRoleSidebarNav,
  DISCOVERY_HREF,
  ensureDiscoveryNav,
  resolveSectionBackContext,
  resolveShellWorkspace,
} from '@/lib/layout/authenticated-shell-config'

describe('authenticated-shell-config', () => {
  it('ensureDiscoveryNav appends Discovery when missing', () => {
    const nav = ensureDiscoveryNav([{ href: '/trade', label: 'Trade' }])
    expect(nav[nav.length - 1]).toEqual({ href: DISCOVERY_HREF, label: 'Discovery' })
  })

  it('buildRoleSidebarNav includes Discovery for processor', () => {
    const nav = buildRoleSidebarNav('processor')
    expect(nav.map((i) => i.href)).toContain('/discovery')
  })

  it('resolveShellWorkspace uses admin nav on /admin for admin session', () => {
    const w = resolveShellWorkspace('/admin/users', 'admin', 'farmer')
    expect(w.workspace).toBe('Admin')
    expect(w.navItems.some((i) => i.href === '/admin/lots')).toBe(true)
  })

  it('resolveShellWorkspace uses effective role when not in admin section', () => {
    const w = resolveShellWorkspace('/farmer/lots', 'admin', 'farmer')
    expect(w.workspace).toBe('Farmer')
    expect(w.navItems.some((i) => i.href === '/farmer/lots')).toBe(true)
  })

  it('buildAdminSidebarNav lists discovery and admin overview', () => {
    const nav = buildAdminSidebarNav()
    expect(nav.map((i) => i.href)).toContain('/discovery')
    expect(nav.map((i) => i.href)).toContain('/admin')
  })

  it('resolveSectionBackContext hides back bar on home', () => {
    expect(resolveSectionBackContext('/').hideBackBar).toBe(true)
  })

  it('resolveSectionBackContext hides back bar on section roots', () => {
    expect(resolveSectionBackContext('/trade').hideBackBar).toBe(true)
    expect(resolveSectionBackContext('/discovery').hideBackBar).toBe(true)
  })
})
