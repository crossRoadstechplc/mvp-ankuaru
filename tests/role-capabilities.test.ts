// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { getRoleCapability, isRoleReadOnly } from '@/lib/roles/capabilities'

describe('role capability map', () => {
  it('gives farmers domain-specific create actions', () => {
    const farmer = getRoleCapability('farmer')

    expect(farmer.canCreate.map((action) => action.id)).toEqual(
      expect.arrayContaining(['add-field', 'create-lot']),
    )
    expect(farmer.canManage).toEqual(expect.arrayContaining(['fields', 'lots']))
  })

  it('keeps regulators read-only', () => {
    const regulator = getRoleCapability('regulator')

    expect(regulator.canCreate).toEqual([])
    expect(regulator.canManage).toEqual([])
    expect(regulator.isReadOnly).toBe(true)
    expect(isRoleReadOnly('regulator')).toBe(true)
  })

  it('separates unrelated create scopes across roles', () => {
    const bank = getRoleCapability('bank')
    const lab = getRoleCapability('lab')

    expect(bank.canCreate.some((action) => action.id === 'create-bank-review')).toBe(true)
    expect(bank.canCreate.some((action) => action.id === 'create-lab-result')).toBe(false)
    expect(lab.canCreate.some((action) => action.id === 'create-lab-result')).toBe(true)
    expect(lab.canCreate.some((action) => action.id === 'create-bank-review')).toBe(false)
  })

  it('gives processor a real processing action and importer RFQ create', () => {
    const processor = getRoleCapability('processor')
    const importer = getRoleCapability('importer')

    expect(processor.canCreate.map((a) => a.id)).toEqual(['record-processing'])
    expect(importer.canCreate.map((a) => a.id)).toEqual(['create-rfq'])
  })
})
