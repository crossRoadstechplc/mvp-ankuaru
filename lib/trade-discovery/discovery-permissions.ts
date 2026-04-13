import type { Role } from '@/lib/domain/types'

/**
 * Discovery marketplace (MVP) — permission model
 *
 * - **Visibility**: Every authenticated user can open `/discovery` and browse RFQs, bids (subject to
 *   commercial redaction), and closed outcomes. No role is blocked from viewing the board.
 * - **Actions**:
 *   - Publish RFQ: `processor`, `exporter`, `importer`
 *   - Submit bid / select winning bid: `exporter`, `importer`
 *   Other roles see the same data with read-only affordances; APIs return 401/403 if invoked without
 *   an authorized mock session (see `lib/auth/api-guards.ts`).
 *
 * Bids are the only competitive response type in this MVP (no separate IOI / non-binding offer flow).
 */

export const DISCOVERY_RFQ_PUBLISHER_ROLES = ['processor', 'exporter', 'importer'] as const
export const DISCOVERY_BIDDER_ROLES = ['exporter', 'importer'] as const

export type DiscoveryRfqPublisherRole = (typeof DISCOVERY_RFQ_PUBLISHER_ROLES)[number]
export type DiscoveryBidderRole = (typeof DISCOVERY_BIDDER_ROLES)[number]

export const isDiscoveryRfqPublisherRole = (role: Role | null | undefined): role is DiscoveryRfqPublisherRole =>
  role === 'processor' || role === 'exporter' || role === 'importer'

export const isDiscoveryBidderRole = (role: Role | null | undefined): role is DiscoveryBidderRole =>
  role === 'exporter' || role === 'importer'

export const canCreateDiscoveryRfq = (role: Role | null | undefined): boolean => isDiscoveryRfqPublisherRole(role)

export const canSubmitDiscoveryBid = (role: Role | null | undefined): boolean => isDiscoveryBidderRole(role)

export const canSelectWinningBidForRfq = (
  actorUserId: string | null | undefined,
  actorRole: Role | null | undefined,
  rfq: { createdByUserId: string },
): boolean =>
  Boolean(actorUserId && isDiscoveryBidderRole(actorRole) && rfq.createdByUserId === actorUserId)
