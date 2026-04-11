import { parseMockSession } from '@/lib/auth/api-guards'
import { MasterDataError } from '@/lib/master-data/crud'

const LINEAGE_KEYS = ['parentLotIds', 'childLotIds'] as const

/**
 * Master PATCH on lots must not casually rewrite lineage snapshots.
 * Only **admin** mock sessions may send `parentLotIds` / `childLotIds` updates (break-glass).
 */
export const assertLotLineagePatchAllowed = (request: Request, payload: unknown): void => {
  if (typeof payload !== 'object' || payload === null) {
    return
  }
  const body = payload as Record<string, unknown>
  const touchesLineage = LINEAGE_KEYS.some((k) => Object.hasOwn(body, k))
  if (!touchesLineage) {
    return
  }
  const session = parseMockSession(request)
  if (session?.role === 'admin') {
    return
  }
  throw new MasterDataError(
    'Updating parentLotIds or childLotIds via master API is restricted to admin (lineage is event-derived)',
    403,
    'forbidden_lineage_patch',
  )
}
