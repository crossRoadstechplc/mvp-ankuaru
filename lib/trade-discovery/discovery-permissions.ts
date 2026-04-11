import type { Role } from '@/lib/domain/types'

/**
 * Discovery marketplace (MVP) — permission model
 *
 * - **Visibility**: Every authenticated user can open `/discovery` and browse RFQs, bids (subject to
 *   commercial redaction), and closed outcomes. No role is blocked from viewing the board.
 * - **Actions** (publish RFQ, submit bid, select winning bid): only `exporter` and `importer` roles.
 *   Other roles see the same data with read-only affordances; APIs return 401/403 if invoked without
 *   an authorized mock session (see `lib/auth/api-guards.ts`).
 *
 * Bids are the only competitive response type in this MVP (no separate IOI / non-binding offer flow).
 */

/** Roles that may publish RFQs, submit bids, and select winners on RFQs they own. */
export const DISCOVERY_ACTOR_ROLES = ['exporter', 'importer'] as const

export type DiscoveryActorRole = (typeof DISCOVERY_ACTOR_ROLES)[number]

export const isDiscoveryActorRole = (role: Role | null | undefined): role is DiscoveryActorRole =>
  role === 'exporter' || role === 'importer'

export const canCreateDiscoveryRfq = (role: Role | null | undefined): boolean => isDiscoveryActorRole(role)

export const canSubmitDiscoveryBid = (role: Role | null | undefined): boolean => isDiscoveryActorRole(role)

export const canSelectWinningBidForRfq = (
  actorUserId: string | null | undefined,
  actorRole: Role | null | undefined,
  rfq: { createdByUserId: string },
): boolean =>
  Boolean(actorUserId && isDiscoveryActorRole(actorRole) && rfq.createdByUserId === actorUserId)
