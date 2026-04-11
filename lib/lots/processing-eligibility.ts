import type { Lot, User } from '@/lib/domain/types'
import { MasterDataError } from '@/lib/master-data/master-data-error'

/**
 * Admin may record processing against common operational snapshots (demos, repair).
 * Includes legacy paths that are not the normal post-aggregation handoff.
 */
export const ADMIN_PROCESSING_INPUT_STATUSES: readonly Lot['status'][] = [
  'ACTIVE',
  'IN_PROCESSING',
  'READY_FOR_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

/** Normal processor workflow: lot was handed off for washing/processing (e.g. AGGREGATE output). */
export const PROCESSOR_PIPELINE_INPUT_STATUS: Lot['status'] = 'READY_FOR_PROCESSING'

type ActorLike = Pick<User, 'id' | 'role'>

/**
 * Enforces role + canonical lot state for PROCESS. Admin keeps a broader status allow-list.
 */
export const assertActorMayProcessSourceLot = (actor: ActorLike, source: Lot): void => {
  if (actor.role === 'admin') {
    if (!ADMIN_PROCESSING_INPUT_STATUSES.includes(source.status)) {
      throw new MasterDataError('Input lot is not eligible for processing', 400, 'invalid_lot_status')
    }
    return
  }

  if (actor.role !== 'processor') {
    throw new MasterDataError('Only processor or admin roles can record processing', 403, 'forbidden_role')
  }

  if (source.status !== PROCESSOR_PIPELINE_INPUT_STATUS) {
    throw new MasterDataError(
      'Processors may only run against lots in READY_FOR_PROCESSING (released for the wash line — typically the output of aggregation).',
      400,
      'invalid_lot_status',
    )
  }
}
