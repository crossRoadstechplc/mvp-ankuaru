// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { buildRoleDashboardView } from '@/lib/roles/dashboard'
import { getRoleCapability } from '@/lib/roles/capabilities'

const navHrefs = (role: Parameters<typeof getRoleCapability>[0]) =>
  getRoleCapability(role).navigation.map((n) => n.href)

describe('role-task contract — navigation', () => {
  it('farmer nav excludes bank, trade, lab, transport, admin', () => {
    const hrefs = navHrefs('farmer')
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/trade'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/lab'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/transport'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/admin'))).toBe(false)
    expect(hrefs).toContain('/discovery')
  })

  it('aggregator nav excludes field tools, bank, lab, admin', () => {
    const hrefs = navHrefs('aggregator')
    expect(hrefs.some((h) => h.startsWith('/farmer/fields'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/lab'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/admin'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/trade/rfqs'))).toBe(false)
  })

  it('processor nav excludes aggregation, bank, lab, admin', () => {
    const hrefs = navHrefs('processor')
    expect(hrefs.some((h) => h.includes('create-aggregation'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/lab'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/admin'))).toBe(false)
    expect(hrefs).toContain('/processor/record')
  })

  it('transporter nav excludes processing and field tools', () => {
    const hrefs = navHrefs('transporter')
    expect(hrefs.some((h) => h.includes('/processor'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/farmer'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
  })

  it('lab nav excludes bank and transport', () => {
    const hrefs = navHrefs('lab')
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/transport'))).toBe(false)
  })

  it('exporter nav excludes field, processing, lab assess, transport', () => {
    const hrefs = navHrefs('exporter')
    expect(hrefs.some((h) => h.includes('/farmer'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/processor'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/lab'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/transport'))).toBe(false)
  })

  it('importer nav excludes admin, bank, field, processing', () => {
    const hrefs = navHrefs('importer')
    expect(hrefs.some((h) => h.includes('/admin'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/bank'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/farmer/fields'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/processor'))).toBe(false)
  })

  it('bank nav excludes field, aggregation, processing, lab', () => {
    const hrefs = navHrefs('bank')
    expect(hrefs.some((h) => h.includes('/farmer/fields'))).toBe(false)
    expect(hrefs.some((h) => h.includes('aggregation'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/processor'))).toBe(false)
    expect(hrefs.some((h) => h.includes('/lab'))).toBe(false)
  })

  it('regulator has no create actions and read-only flag', () => {
    const cap = getRoleCapability('regulator')
    expect(cap.canCreate).toHaveLength(0)
    expect(cap.isReadOnly).toBe(true)
  })
})

describe('role-task contract — dashboard modules', () => {
  const store = cloneSeedData()

  it('caps modules at four', () => {
    for (const role of [
      'farmer',
      'aggregator',
      'processor',
      'transporter',
      'lab',
      'exporter',
      'importer',
      'bank',
      'admin',
      'regulator',
    ] as const) {
      const v = buildRoleDashboardView(store, role, store.users.find((u) => u.role === role)?.id ?? null)
      expect(v.modules.length).toBeLessThanOrEqual(4)
    }
  })
})
