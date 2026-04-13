import type { Role } from '@/lib/domain/types'

export type RoleCreateActionId =
  | 'add-field'
  | 'create-lot'
  | 'create-aggregation'
  | 'record-processing'
  | 'record-dispatch'
  | 'record-receipt'
  | 'create-lab-result'
  | 'create-rfq'
  | 'submit-bid'
  | 'create-import-request'
  | 'create-bank-review'
  | 'create-master-data'

export type RoleCreateAction = {
  id: RoleCreateActionId
  label: string
  description: string
  href: string
}

export type RoleNavigationItem = {
  label: string
  href: string
}

export type RoleCapability = {
  role: Role
  label: string
  description: string
  canView: string[]
  canCreate: RoleCreateAction[]
  canManage: string[]
  navigation: RoleNavigationItem[]
  isReadOnly: boolean
}

const createActionHref = (role: Role, action: RoleCreateActionId): string =>
  `/actions/${action}?role=${role}`

export const ROLE_CAPABILITIES: Record<Role, RoleCapability> = {
  farmer: {
    role: 'farmer',
    label: 'Farmer',
    description: 'Track production plots, picked lots, and the earliest traceability events.',
    canView: ['farmerProfiles', 'fields', 'lots', 'events'],
    canCreate: [
      {
        id: 'add-field',
        label: 'Add field',
        description: 'Register a new production plot for the selected farmer.',
        href: '/farmer/fields',
      },
      {
        id: 'create-lot',
        label: 'Create pick',
        description: 'Create a new harvest pick snapshot that can later be backed by events.',
        href: '/farmer/lots',
      },
    ],
    canManage: ['fields', 'lots'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Fields', href: '/farmer/fields' },
      { label: 'Lots', href: '/farmer/lots' },
    ],
    isReadOnly: false,
  },
  aggregator: {
    role: 'aggregator',
    label: 'Aggregator',
    description: 'Source farmer lots, validate quality signals, and aggregate eligible inventory.',
    canView: ['lots', 'rfqs', 'bids', 'events'],
    canCreate: [
      {
        id: 'create-aggregation',
        label: 'Create aggregation',
        description: 'Combine eligible origin lots into a new aggregated lot.',
        href: createActionHref('aggregator', 'create-aggregation'),
      },
    ],
    canManage: ['bids'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Lot validation', href: '/aggregator/lot-validation' },
      { label: 'Create aggregation', href: '/actions/create-aggregation?role=aggregator' },
      { label: 'Farmer lots', href: '/farmer/lots' },
    ],
    isReadOnly: false,
  },
  processor: {
    role: 'processor',
    label: 'Processor',
    description: 'Record processing runs, outputs, and byproducts against eligible lots.',
    canView: ['lots', 'events', 'labResults'],
    canCreate: [
      {
        id: 'record-processing',
        label: 'Record processing',
        description: 'Mass-balanced processing with main output and classified byproducts.',
        href: '/processor/record',
      },
    ],
    canManage: ['lots'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Processor workspace', href: '/processor' },
      { label: 'Record processing', href: '/processor/record' },
    ],
    isReadOnly: false,
  },
  transporter: {
    role: 'transporter',
    label: 'Transporter',
    description: 'Log dispatch and receipt activities for lots in motion.',
    canView: ['lots', 'events', 'vehicles', 'drivers'],
    canCreate: [
      {
        id: 'record-dispatch',
        label: 'Record dispatch',
        description: 'Log dispatch, vehicle and driver, and move custody to the carrier.',
        href: '/transport/dispatch',
      },
      {
        id: 'record-receipt',
        label: 'Record receipt',
        description: 'Log receipt and transfer custody from the transporter to the receiver.',
        href: '/transport/receipt',
      },
    ],
    canManage: ['vehicles', 'drivers'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Transport', href: '/transport' },
    ],
    isReadOnly: false,
  },
  lab: {
    role: 'lab',
    label: 'Lab',
    description: 'Review lots at lab, issue scores, and keep quality evidence linked to trace events.',
    canView: ['lots', 'events', 'labResults'],
    canCreate: [
      {
        id: 'create-lab-result',
        label: 'Lab dashboard',
        description: 'Open the lab queue, record results, and drive quality status for incoming lots.',
        href: '/lab',
      },
    ],
    canManage: ['labResults'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Lab', href: '/lab' },
    ],
    isReadOnly: false,
  },
  exporter: {
    role: 'exporter',
    label: 'Exporter',
    description: 'Prepare lots for export, financing, and downstream trade execution.',
    canView: ['lots', 'rfqs', 'bids', 'trades', 'events', 'bankReviews'],
    canCreate: [
      {
        id: 'create-rfq',
        label: 'Create RFQ',
        description: 'Publish quantity, quality, and location for discovery bids (exporter/importer).',
        href: '/trade/rfqs/new',
      },
    ],
    canManage: ['trades', 'lots'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Trade', href: '/trade' },
      { label: 'RFQs', href: '/trade/rfqs' },
      { label: 'Delivery', href: '/trade/delivery' },
    ],
    isReadOnly: false,
  },
  importer: {
    role: 'importer',
    label: 'Importer',
    description: 'Track sourcing demand and the lots tied to inbound trade opportunities.',
    canView: ['rfqs', 'bids', 'trades', 'lots'],
    canCreate: [
      {
        id: 'create-rfq',
        label: 'Create RFQ',
        description: 'Publish a discovery request on the shared marketplace.',
        href: '/trade/rfqs/new',
      },
    ],
    canManage: ['rfqs'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Importer portal', href: '/importer' },
      { label: 'Delivery', href: '/trade/delivery' },
    ],
    isReadOnly: false,
  },
  bank: {
    role: 'bank',
    label: 'Bank',
    description: 'Financing decisions, onboarding reviews, and collateral visibility.',
    canView: ['bankReviews', 'trades', 'lots', 'events'],
    canCreate: [
      {
        id: 'create-bank-review',
        label: 'User onboarding reviews',
        description: 'Open the bank onboarding queue, run simulated background checks, and activate applicants.',
        href: '/bank/onboarding',
      },
    ],
    canManage: ['bankReviews'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Bank', href: '/bank' },
      { label: 'Onboarding', href: '/bank/onboarding' },
    ],
    isReadOnly: false,
  },
  admin: {
    role: 'admin',
    label: 'Admin',
    description: 'Platform master data, integrity tooling, and role monitoring.',
    canView: ['users', 'fields', 'lots', 'events', 'rfqs', 'bids', 'trades', 'labResults', 'bankReviews', 'vehicles', 'drivers'],
    canCreate: [
      {
        id: 'create-master-data',
        label: 'Admin overview',
        description: 'Master data hubs and system tools.',
        href: '/admin',
      },
    ],
    canManage: ['users', 'fields', 'lots', 'rfqs', 'bids', 'trades', 'labResults', 'bankReviews', 'vehicles', 'drivers'],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Admin', href: '/admin' },
      { label: 'Users', href: '/admin/users' },
      { label: 'Lots', href: '/admin/lots' },
      { label: 'Integrity', href: '/admin/integrity' },
      { label: 'Role monitor', href: '/admin/role-monitor' },
    ],
    isReadOnly: false,
  },
  regulator: {
    role: 'regulator',
    label: 'Regulator',
    description: 'Observe traceability, compliance, and ledger integrity without creating or mutating records.',
    canView: ['users', 'fields', 'lots', 'events', 'rfqs', 'bids', 'trades', 'labResults', 'bankReviews', 'vehicles', 'drivers'],
    canCreate: [],
    canManage: [],
    navigation: [
      { label: 'Discovery', href: '/discovery' },
      { label: 'Oversight', href: '/regulator' },
    ],
    isReadOnly: true,
  },
}

export const getRoleCapability = (role: Role): RoleCapability => ROLE_CAPABILITIES[role]

export const isRoleReadOnly = (role: Role): boolean => ROLE_CAPABILITIES[role].isReadOnly

export const findRoleAction = (
  role: Role,
  actionId: RoleCreateActionId,
): RoleCreateAction | undefined =>
  ROLE_CAPABILITIES[role].canCreate.find((action) => action.id === actionId)
