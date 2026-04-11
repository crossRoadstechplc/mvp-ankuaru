import type { LiveDataStore, Role, User } from '@/lib/domain/types'
import { exportEligibilityLabel } from '@/lib/labs/export-eligibility'
import { getLotsInLabQueue } from '@/lib/labs/lab-queue'
import { getAuthorizedLotIdsForImporter } from '@/lib/permissions/importer-access'
import type { SummaryCardData } from '@/lib/summary'

import { getRoleCapability, type RoleCreateAction, type RoleNavigationItem } from './capabilities'

const MAX_DASHBOARD_MODULES = 4

export type RoleModuleItem = {
  id: string
  label: string
  detail: string
  href?: string
}

export type RoleModule = {
  id: string
  title: string
  summary: string
  items: RoleModuleItem[]
}

export type RoleDashboardView = {
  capability: ReturnType<typeof getRoleCapability>
  selectedUser?: User
  summaryCards: SummaryCardData[]
  actions: RoleCreateAction[]
  navigation: RoleNavigationItem[]
  modules: RoleModule[]
}

const makeItems = <T,>(
  entries: T[],
  mapper: (entry: T, index: number) => RoleModuleItem,
): RoleModuleItem[] => entries.slice(0, 4).map(mapper)

/** Role home avoids duplicate numeric tiles; use modules and real routes for detail. */
const buildSummaryCards = (_store: LiveDataStore, _role: Role): SummaryCardData[] => []

const buildModulesByRole = (
  store: LiveDataStore,
  role: Role,
  selectedUserId?: string | null,
): RoleModule[] => {
  switch (role) {
    case 'farmer': {
      const farmerUserId = selectedUserId ?? undefined
      const fieldsForFarmer = farmerUserId
        ? store.fields.filter((field) => field.farmerId === farmerUserId)
        : store.fields
      const lotsForFarmer = farmerUserId
        ? store.lots.filter((lot) => lot.farmerId === farmerUserId)
        : store.lots.filter((lot) => Boolean(lot.farmerId))

      return [
        {
          id: 'fields',
          title: 'Field registry',
          summary: `${fieldsForFarmer.length} mapped fields currently tracked`,
          items: makeItems(fieldsForFarmer, (field) => ({
            id: field.id,
            label: field.name,
            detail: `Farmer ${field.farmerId} | ${field.areaSqm ?? 'unknown'} sqm`,
          })),
        },
        {
          id: 'origin-lots',
          title: 'Origin lots',
          summary: `${lotsForFarmer.length} lots for the selected farmer`,
          items: makeItems(lotsForFarmer, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.form} | ${lot.status}`,
            href: `/lots/${lot.id}`,
          })),
        },
      ]
    }
    case 'aggregator': {
      const farmerHeld = store.lots.filter((l) => l.ownerRole === 'farmer' && l.custodianRole === 'farmer')
      const awaitingAggregator = farmerHeld.filter((l) => l.validationStatus === 'PENDING')
      const validatedFarmerHeld = farmerHeld.filter((l) => l.validationStatus === 'VALIDATED')
      const rejectedAggregator = farmerHeld.filter((l) => l.validationStatus === 'REJECTED')
      const pendingLab = store.lots.filter((l) => l.labStatus === 'PENDING')
      const approvedLab = store.lots.filter((l) => l.labStatus === 'APPROVED')
      const rejected = store.lots.filter((l) => l.labStatus === 'FAILED' || l.status === 'QUARANTINED')
      const aggEvents = store.events.filter((e) => e.type === 'AGGREGATE')
      return [
        {
          id: 'origin-lots',
          title: 'Farmer & origin lots',
          summary: `${farmerHeld.length} lots still at farm ownership/custody`,
          items: makeItems(farmerHeld, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.form} · ${lot.weight} kg · ${lot.validationStatus}`,
            href: `/lots/${lot.id}`,
          })),
        },
        {
          id: 'aggregator-lot-validation',
          title: 'Aggregator lot validation',
          summary: `${awaitingAggregator.length} awaiting · ${validatedFarmerHeld.length} validated · ${rejectedAggregator.length} rejected`,
          items: [
            {
              id: 'agg-val-awaiting',
              label: 'Awaiting validation',
              detail: `${awaitingAggregator.length} farmer-held lot(s)`,
              href: '/aggregator/lot-validation#awaiting',
            },
            {
              id: 'agg-val-validated',
              label: 'Validated lots',
              detail: `${validatedFarmerHeld.length} farmer-held lot(s) cleared for aggregation`,
              href: '/aggregator/lot-validation#validated',
            },
            {
              id: 'agg-val-rejected',
              label: 'Rejected lots',
              detail: `${rejectedAggregator.length} not eligible for aggregation`,
              href: '/aggregator/lot-validation#rejected',
            },
          ],
        },
        {
          id: 'quality-pipeline',
          title: 'Lab status',
          summary: `${pendingLab.length} pending · ${approvedLab.length} approved · ${rejected.length} failed / quarantined`,
          items: [
            {
              id: 'lab-pending',
              label: 'Awaiting lab',
              detail: `${pendingLab.length} lot(s)`,
              href: pendingLab[0] ? `/lots/${pendingLab[0].id}` : undefined,
            },
            {
              id: 'lab-approved',
              label: 'Lab approved',
              detail: `${approvedLab.length} lot(s)`,
              href: approvedLab[0] ? `/lots/${approvedLab[0].id}` : undefined,
            },
            {
              id: 'lab-rejected',
              label: 'Failed / quarantined',
              detail: `${rejected.length} lot(s)`,
              href: rejected[0] ? `/lots/${rejected[0].id}` : undefined,
            },
          ],
        },
        {
          id: 'aggregation',
          title: 'Aggregation activity',
          summary: `${aggEvents.length} AGGREGATE events on the ledger`,
          items: makeItems(aggEvents, (event) => ({
            id: event.id,
            label: event.type,
            detail: `${event.timestamp.slice(0, 10)} · ${event.inputLotIds.length} sources`,
          })),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    }
    case 'processor': {
      const processReady = store.lots.filter((lot) => lot.status === 'READY_FOR_PROCESSING')
      const processEvents = store.events.filter((e) => e.type === 'PROCESS')
      const outputs = store.lots.filter((lot) => ['GREEN', 'BYPRODUCT', 'PARCHMENT'].includes(lot.form))
      return [
        {
          id: 'process-ready',
          title: 'Ready for processing',
          summary: `${processReady.length} lot(s) in READY_FOR_PROCESSING (post-aggregation handoff)`,
          items: makeItems(processReady, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.form} · ${lot.weight} kg`,
            href: `/processor/record`,
          })),
        },
        {
          id: 'processing-history',
          title: 'Processing history',
          summary: `${processEvents.length} PROCESS events`,
          items: makeItems(processEvents, (event) => ({
            id: event.id,
            label: event.type,
            detail: `${event.inputLotIds.join(', ')} → ${event.outputLotIds.join(', ')}`,
          })),
        },
        {
          id: 'derived-output-lots',
          title: 'Outputs & byproducts',
          summary: `${outputs.length} downstream lots (GREEN / PARCHMENT / BYPRODUCT)`,
          items: makeItems(outputs, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.form} | ${lot.weight} kg`,
            href: `/lots/${lot.id}`,
          })),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    }
    case 'transporter': {
      const inTransit = store.lots.filter((lot) => lot.status === 'IN_TRANSIT')
      const transportEvents = store.events.filter((e) => ['DISPATCH', 'RECEIPT'].includes(e.type))
      return [
        {
          id: 'custody-jobs',
          title: 'Custody & assigned movement',
          summary: `${inTransit.length} in transit · ${transportEvents.length} dispatch/receipt events`,
          items: [
            ...makeItems(inTransit, (lot) => ({
              id: lot.id,
              label: lot.publicLotCode,
              detail: `IN_TRANSIT · custodian ${lot.custodianRole}`,
              href: `/lots/${lot.id}`,
            })),
            ...makeItems(transportEvents, (event) => ({
              id: event.id,
              label: event.type,
              detail: `${event.timestamp.slice(0, 16)} · actor ${event.actorId}`,
            })),
          ].slice(0, 4),
        },
        {
          id: 'ownership-note',
          title: 'Custody vs ownership',
          summary: 'Dispatch moves custody; legal ownership follows ledger ownership events.',
          items: [
            {
              id: 'dispatch-link',
              label: 'Record dispatch',
              detail: 'Hand custody to carrier',
              href: '/transport/dispatch',
            },
            {
              id: 'receipt-link',
              label: 'Record receipt',
              detail: 'Complete handover',
              href: '/transport/receipt',
            },
          ],
        },
      ]
    }
    case 'lab':
      return [
        {
          id: 'lab-queue',
          title: 'Lots awaiting assessment',
          summary: `${getLotsInLabQueue(store).length} need a quality decision`,
          items: makeItems(getLotsInLabQueue(store), (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.labStatus} · ${lot.status} · ${lot.weight} kg`,
            href: `/lab/lots/${lot.id}/assess`,
          })),
        },
        {
          id: 'lab-results',
          title: 'Lab results & scores',
          summary: `${store.labResults.length} recorded results`,
          items: makeItems(store.labResults, (result) => ({
            id: result.id,
            label: result.id,
            detail: `${result.status}${result.score ? ` | ${result.score}` : ''}`,
          })),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    case 'exporter':
      return [
        {
          id: 'ready-for-export',
          title: 'Export-ready lots',
          summary: `${store.lots.filter((lot) => lot.status === 'READY_FOR_EXPORT').length} lots · lab eligibility shown per row`,
          items: makeItems(
            store.lots.filter((lot) => lot.status === 'READY_FOR_EXPORT'),
            (lot) => ({
              id: lot.id,
              label: lot.publicLotCode,
              detail: `${lot.form} | ${exportEligibilityLabel(lot)}`,
              href: `/lots/${lot.id}`,
            }),
          ),
        },
        {
          id: 'trade-finance',
          title: 'Trade lifecycle',
          summary: `${store.trades.length} trades (status & bank gate)`,
          items: makeItems(store.trades, (trade) => ({
            id: trade.id,
            label: trade.id,
            detail: `${trade.status} | bank approved: ${trade.bankApproved ? 'yes' : 'no'}`,
            href: `/trade/trades/${trade.id}`,
          })),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    case 'importer': {
      const buyerId = selectedUserId ?? 'user-importer-001'
      const authorizedIds = getAuthorizedLotIdsForImporter(store, buyerId)
      const authLots = authorizedIds
        .map((id) => store.lots.find((l) => l.id === id))
        .filter((l): l is NonNullable<typeof l> => l !== undefined)
      return [
        {
          id: 'authorized-trace',
          title: 'Authorized trace lots',
          summary: `${authLots.length} lots linked to your purchase trades`,
          items: makeItems(authLots, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.form} · ${lot.status}`,
            href: `/importer/lots/${lot.id}`,
          })),
        },
        {
          id: 'trade-rfq',
          title: 'Trade activity',
          summary: `${store.trades.filter((t) => t.buyerUserId === buyerId).length} trades as buyer`,
          items: makeItems(
            store.trades.filter((t) => t.buyerUserId === buyerId),
            (trade) => ({
              id: trade.id,
              label: trade.id,
              detail: `${trade.status} · ${trade.lotIds.length} lot(s)`,
              href: `/trade/trades/${trade.id}`,
            }),
          ),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    }
    case 'bank': {
      const pendingFin = store.trades.filter(
        (t) => !t.bankApproved && ['DRAFT', 'OPEN', 'BID_SELECTED', 'BANK_PENDING'].includes(t.status),
      )
      const collateralCount = store.lots.filter((l) => l.isCollateral).length
      return [
        {
          id: 'pending-trades',
          title: 'Trade approvals & financing',
          summary: `${pendingFin.length} pending · ${collateralCount} collateral lot(s) in store`,
          items: makeItems(pendingFin, (trade) => ({
            id: trade.id,
            label: trade.id,
            detail: `${trade.status} | lots ${trade.lotIds.join(', ') || '—'}`,
            href: `/bank/trades/${trade.id}`,
          })),
        },
        {
          id: 'reviews',
          title: 'Onboarding reviews',
          summary: `${store.bankReviews.length} applicant reviews`,
          items: makeItems(store.bankReviews, (review) => ({
            id: review.id,
            label: review.id,
            detail: `${review.reviewStatus} | applicant ${review.applicantUserId}`,
            href: `/bank/onboarding/${review.id}`,
          })),
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    }
    case 'admin':
      return [
        {
          id: 'master-data',
          title: 'Master data',
          summary: `${store.users.length} users · ${store.fields.length} fields · ${store.lots.length} lots`,
          items: [
            { id: 'users', label: 'Users', detail: 'Identities & roles', href: '/admin/users' },
            { id: 'fields', label: 'Fields', detail: 'Farm geometry', href: '/admin/fields' },
            { id: 'lots', label: 'Lots', detail: 'Snapshots & transforms', href: '/admin/lots' },
            { id: 'bank-ob', label: 'Bank onboarding', detail: 'Applicant reviews', href: '/admin/bank-onboarding' },
          ],
        },
        {
          id: 'platform-health',
          title: 'Integrity & monitoring',
          summary: `${store.events.length} ledger events · quarantine & actor tooling`,
          items: [
            {
              id: 'integrity',
              label: 'Integrity engine',
              detail: 'Truth checks & quarantine',
              href: '/admin/integrity',
            },
            {
              id: 'role-monitor',
              label: 'Role monitor',
              detail: 'Sandbox previews',
              href: '/admin/role-monitor',
            },
            {
              id: 'inventory',
              label: 'Inventory dashboards',
              detail: 'Byproducts & charts',
              href: '/admin/inventory/dashboard',
            },
          ],
        },
      ].slice(0, MAX_DASHBOARD_MODULES)
    case 'regulator':
      return [
        {
          id: 'oversight',
          title: 'Read-only snapshots',
          summary: `${store.lots.length} lots · ${store.events.length} events · open Oversight for trades`,
          items: makeItems(store.lots, (lot) => ({
            id: lot.id,
            label: lot.publicLotCode,
            detail: `${lot.status} · integrity ${lot.integrityStatus}`,
            href: `/lots/${lot.id}`,
          })),
        },
      ]
  }
}

export const buildRoleDashboardView = (
  store: LiveDataStore,
  role: Role,
  selectedUserId?: string | null,
): RoleDashboardView => {
  const capability = getRoleCapability(role)
  const selectedUser = store.users.find((user) => user.id === selectedUserId && user.role === role)

  return {
    capability,
    selectedUser,
    summaryCards: buildSummaryCards(store, role),
    actions: capability.canCreate,
    navigation: capability.navigation,
    modules: buildModulesByRole(store, role, selectedUserId).slice(0, MAX_DASHBOARD_MODULES),
  }
}
