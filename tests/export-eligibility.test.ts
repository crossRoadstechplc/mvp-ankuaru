// @vitest-environment node

import { describe, expect, it } from 'vitest'

import type { Lot } from '@/lib/domain/types'
import {
  exportEligibilityLabel,
  isLotExportEligible,
  requiresLabApproval,
} from '@/lib/labs/export-eligibility'

const baseLot = (overrides: Partial<Lot>): Lot => ({
  id: 'lot-x',
  publicLotCode: 'CODE',
  internalUuid: 'u',
  traceKey: 't',
  form: 'GREEN',
  weight: 100,
  ownerId: 'o',
  ownerRole: 'exporter',
  custodianId: 'c',
  custodianRole: 'exporter',
  parentLotIds: [],
  childLotIds: [],
  status: 'READY_FOR_EXPORT',
  labStatus: 'NOT_REQUIRED',
  isCollateral: false,
  integrityStatus: 'OK',
  validationStatus: 'VALIDATED',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
  ...overrides,
})

describe('export eligibility helpers', () => {
  it('treats NOT_REQUIRED as not requiring lab approval', () => {
    const lot = baseLot({ labStatus: 'NOT_REQUIRED' })
    expect(requiresLabApproval(lot)).toBe(false)
    expect(isLotExportEligible(lot)).toBe(true)
    expect(exportEligibilityLabel(lot)).toBe('Lab not required')
  })

  it('requires APPROVED when lab workflow applies', () => {
    expect(requiresLabApproval(baseLot({ labStatus: 'PENDING' }))).toBe(true)
    expect(isLotExportEligible(baseLot({ labStatus: 'PENDING' }))).toBe(false)
    expect(isLotExportEligible(baseLot({ labStatus: 'FAILED' }))).toBe(false)
    expect(isLotExportEligible(baseLot({ labStatus: 'APPROVED' }))).toBe(true)
  })

  it('labels blocked lots for exporter UI', () => {
    expect(exportEligibilityLabel(baseLot({ labStatus: 'PENDING' }))).toBe('Lab gate — not export eligible')
    expect(exportEligibilityLabel(baseLot({ labStatus: 'APPROVED' }))).toBe('Export eligible')
  })
})
