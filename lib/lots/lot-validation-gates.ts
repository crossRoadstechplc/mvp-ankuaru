import type { Lot } from '@/lib/domain/types'
import { MasterDataError } from '@/lib/master-data/master-data-error'

/** Farmer-picked lots still on the farm — require aggregator QC before aggregation. */
export const lotIsFarmerOriginHeldAtFarm = (lot: Lot): boolean =>
  Boolean(lot.farmerId) && lot.ownerRole === 'farmer' && lot.custodianRole === 'farmer'

const AGGREGATION_ELIGIBLE_STATUSES: readonly Lot['status'][] = [
  'ACTIVE',
  'IN_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

/**
 * Lots that may appear in the aggregation picker: validated, operational integrity, eligible status.
 * (Quarantine and non-OK integrity are already excluded by status / integrity rules.)
 */
export const lotEligibleForAggregationPicker = (lot: Lot): boolean =>
  AGGREGATION_ELIGIBLE_STATUSES.includes(lot.status) &&
  lot.integrityStatus === 'OK' &&
  lot.validationStatus === 'VALIDATED'

export const assertLotValidatedForAggregationSource = (lot: Lot, context: string): void => {
  if (lot.validationStatus !== 'VALIDATED') {
    throw new MasterDataError(
      `${context}: lot ${lot.publicLotCode} must be aggregator-validated (validationStatus VALIDATED) before aggregation`,
      400,
      'lot_not_validated',
    )
  }
}
