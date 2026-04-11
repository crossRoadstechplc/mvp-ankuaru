import type { Lot, Role } from '@/lib/domain/types'
import { ROLE_VALUES } from '@/lib/domain/constants'
import { MasterDataError } from '@/lib/master-data/master-data-error'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import {
  MOCK_USER_ID_HEADER,
  MOCK_USER_ROLE_HEADER,
} from '@/lib/auth/mock-session-constants'

export { MOCK_USER_ID_HEADER, MOCK_USER_ROLE_HEADER }

export type MockSession = { userId: string; role: Role }

export function parseMockSession(request: Request): MockSession | null {
  const userId = request.headers.get(MOCK_USER_ID_HEADER)?.trim()
  const roleRaw = request.headers.get(MOCK_USER_ROLE_HEADER)?.trim()
  if (!userId || !roleRaw) {
    return null
  }
  if (!ROLE_VALUES.includes(roleRaw as Role)) {
    return null
  }
  return { userId, role: roleRaw as Role }
}

export function requireMockSession(request: Request): MockSession {
  const session = parseMockSession(request)
  if (!session) {
    throw new MasterDataError(
      'Mock session required (x-ankuaru-user-id / x-ankuaru-user-role)',
      401,
      'auth_required',
    )
  }
  return session
}

/** Caller must ensure admin is handled separately if needed. */
export function requireSessionRoles(session: MockSession, allowed: readonly Role[]): void {
  if (!allowed.includes(session.role)) {
    throw new MasterDataError('Insufficient role for this action', 403, 'forbidden_role')
  }
}

async function loadActiveUser(projectRoot: string, userId: string) {
  const store = await readLiveDataStore(projectRoot)
  const user = store.users.find((u) => u.id === userId)
  if (!user?.isActive) {
    throw new MasterDataError('User not found', 404, 'missing_entity')
  }
  return user
}

/**
 * Ledger / lot-transform ops: non-admin callers must use their own user id as actor.
 * Admin may supply `bodyActorId` to act on behalf of a user whose role is allowed for the operation.
 */
export async function resolveActorIdForTransform(
  request: Request,
  projectRoot: string,
  bodyActorId: string,
  allowedActorRoles: readonly Role[],
): Promise<string> {
  const session = requireMockSession(request)
  const trimmedBody = bodyActorId.trim()

  if (session.role === 'admin') {
    const targetId = trimmedBody || session.userId
    const user = await loadActiveUser(projectRoot, targetId)
    if (!allowedActorRoles.includes(user.role)) {
      throw new MasterDataError('Actor role is not permitted for this operation', 403, 'forbidden_role')
    }
    return targetId
  }

  if (trimmedBody !== session.userId) {
    throw new MasterDataError('Actor id does not match signed-in user', 403, 'actor_mismatch')
  }

  const user = await loadActiveUser(projectRoot, session.userId)
  if (!allowedActorRoles.includes(user.role)) {
    throw new MasterDataError('Insufficient role for this action', 403, 'forbidden_role')
  }
  return session.userId
}

/**
 * Bank / lab style: body user id must match session for non-admin; admin may target another user with an allowed role.
 */
export async function resolveBodyUserIdForAdminOrSelf(
  request: Request,
  projectRoot: string,
  bodyUserId: string,
  allowedUserRoles: readonly Role[],
  fieldLabel: string,
): Promise<string> {
  const session = requireMockSession(request)
  const trimmed = bodyUserId.trim()

  if (session.role === 'admin') {
    const user = await loadActiveUser(projectRoot, trimmed)
    if (!allowedUserRoles.includes(user.role)) {
      throw new MasterDataError(`${fieldLabel} role is not permitted for this operation`, 403, 'forbidden_role')
    }
    return trimmed
  }

  if (trimmed !== session.userId) {
    throw new MasterDataError(`${fieldLabel} does not match signed-in user`, 403, 'actor_mismatch')
  }

  const user = await loadActiveUser(projectRoot, session.userId)
  if (!allowedUserRoles.includes(user.role)) {
    throw new MasterDataError('Insufficient role for this action', 403, 'forbidden_role')
  }
  return session.userId
}

export async function requireFarmerSessionMatchesBody(
  request: Request,
  projectRoot: string,
  bodyFarmerId: string,
): Promise<void> {
  const session = requireMockSession(request)
  requireSessionRoles(session, ['farmer'])
  if (bodyFarmerId.trim() !== session.userId) {
    throw new MasterDataError('Farmer id does not match signed-in user', 403, 'actor_mismatch')
  }
  const user = await loadActiveUser(projectRoot, session.userId)
  if (user.role !== 'farmer') {
    throw new MasterDataError('Insufficient role for this action', 403, 'forbidden_role')
  }
}

/** Optional API-level lot check before domain logic (domain still enforces rules). */
export async function requireLotWithStatuses(
  projectRoot: string,
  lotId: string,
  allowedStatuses: readonly Lot['status'][],
  context: string,
): Promise<Lot> {
  const store = await readLiveDataStore(projectRoot)
  const lot = store.lots.find((l) => l.id === lotId)
  if (!lot) {
    throw new MasterDataError(`${context}: lot not found`, 404, 'missing_entity')
  }
  if (!allowedStatuses.includes(lot.status)) {
    throw new MasterDataError(
      `${context}: lot ${lot.publicLotCode} is not eligible for this action`,
      400,
      'invalid_lot_status',
    )
  }
  return lot
}
