import type { LabStatus, Lot } from '@/lib/domain/types'

/**
 * Lots that are not `NOT_REQUIRED` must pass lab approval before exporter-side eligibility checks pass.
 */
export const requiresLabApproval = (lot: Lot): boolean => lot.labStatus !== 'NOT_REQUIRED'

/**
 * Exporter / trade progression may only treat a lot as quality-cleared when lab approval is recorded
 * (or lab was never required).
 */
export const isLotExportEligible = (lot: Lot): boolean => {
  if (!requiresLabApproval(lot)) {
    return true
  }
  return lot.labStatus === 'APPROVED'
}

export const exportEligibilityLabel = (lot: Lot): string => {
  if (!requiresLabApproval(lot)) {
    return 'Lab not required'
  }
  return isLotExportEligible(lot) ? 'Export eligible' : 'Lab gate — not export eligible'
}
