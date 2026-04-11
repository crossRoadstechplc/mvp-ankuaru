import type { LiveDataStore, Role, User } from '@/lib/domain/types'

export type SummaryCardData = {
  id: string
  label: string
  value: string
  detail: string
}

export type RoleDashboardSummary = {
  selectedRole: Role
  selectedUser: User | undefined
  cards: SummaryCardData[]
}

export const buildRoleDashboardSummary = (
  store: LiveDataStore,
  selectedRole: Role,
): RoleDashboardSummary => {
  const usersInRole = store.users.filter((user) => user.role === selectedRole)
  const selectedUser = usersInRole[0]
  const lotsForRole = store.lots.filter(
    (lot) => lot.ownerRole === selectedRole || lot.custodianRole === selectedRole,
  )
  const eventsForRole = store.events.filter((event) => event.actorRole === selectedRole)
  const openRfqs = store.rfqs.filter((rfq) => rfq.status === 'OPEN')
  const activeTrades = store.trades.filter((trade) =>
    ['OPEN', 'BID_SELECTED', 'BANK_PENDING', 'BANK_APPROVED', 'IN_TRANSIT'].includes(
      trade.status,
    ),
  )

  return {
    selectedRole,
    selectedUser,
    cards: [
      {
        id: 'users',
        label: 'Users',
        value: `${usersInRole.length}`,
        detail: `Profiles registered for the ${selectedRole} role`,
      },
      {
        id: 'lots',
        label: 'Lots in view',
        value: `${lotsForRole.length}`,
        detail: 'Lots currently owned or custodied by this role',
      },
      {
        id: 'events',
        label: 'Trace events',
        value: `${eventsForRole.length}`,
        detail: 'Append-only events recorded by this role',
      },
      {
        id: 'pipeline',
        label: 'Open pipeline',
        value: `${openRfqs.length + activeTrades.length}`,
        detail: 'Open RFQs plus trades still moving through the flow',
      },
    ],
  }
}

export const buildGlobalSummaryCards = (store: LiveDataStore): SummaryCardData[] => [
  {
    id: 'farmers',
    label: 'Farmers',
    value: `${store.farmerProfiles.length}`,
    detail: 'Farmer profiles in the canonical store',
  },
  {
    id: 'fields',
    label: 'Fields',
    value: `${store.fields.length}`,
    detail: 'Mapped production plots with polygon geometry',
  },
  {
    id: 'lots',
    label: 'Lots',
    value: `${store.lots.length}`,
    detail: 'Current-state lot snapshots backed by events',
  },
  {
    id: 'trades',
    label: 'Trades',
    value: `${store.trades.length}`,
    detail: 'Dummy trade records available for the first iteration',
  },
]
