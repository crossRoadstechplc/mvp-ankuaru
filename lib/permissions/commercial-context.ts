import type { Role } from '@/lib/domain/types'

/**
 * - `trade_discovery`: RFQs/bids — importer/bank/exporter/etc. see pricing where allowed.
 * - `physical_truth`: Lot trace / custody views — importer sees no commercial terms (only physical trace).
 * - `regulator_oversight`: Always strip commercial fields (same as non-commercial roles).
 */
export type CommercialContext = 'trade_discovery' | 'physical_truth' | 'regulator_oversight'

/** Roles that see bid prices & trade financing in discovery / deal workflows. */
export const COMMERCIAL_SENSITIVE_ROLES: Role[] = [
  'exporter',
  'aggregator',
  'importer',
  'bank',
  'admin',
]

const PHYSICAL_TRUTH_COMMERCIAL_ROLES: Role[] = ['exporter', 'aggregator', 'bank', 'admin']

/** Whether bid/trade pricing & financing fields may be shown for this role in the given context. */
export const roleSeesCommercialInContext = (role: Role, context: CommercialContext): boolean => {
  if (context === 'regulator_oversight') {
    return false
  }
  if (context === 'physical_truth') {
    return PHYSICAL_TRUTH_COMMERCIAL_ROLES.includes(role)
  }
  return COMMERCIAL_SENSITIVE_ROLES.includes(role)
}
