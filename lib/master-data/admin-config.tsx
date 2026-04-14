import Link from 'next/link'

import {
  LAB_STATUS_VALUES,
  LOT_FORM_VALUES,
  LOT_INTEGRITY_VALUES,
  LOT_STATUS_VALUES,
  LOT_VALIDATION_STATUS_VALUES,
  ROLE_VALUES,
} from '@/lib/domain/constants'
import type { Field, Lot, User } from '@/lib/domain/types'

import type { CrudFieldConfig } from '@/components/crud/crud-shell'

type CrudFormValues = Record<string, string | boolean>

export type CrudPageConfig<T extends { id: string }> = {
  title: string
  description: string
  apiBasePath: string
  fields: CrudFieldConfig[]
  createValues: () => CrudFormValues
  toFormValues: (item: T) => CrudFormValues
  fromFormValues: (values: CrudFormValues) => unknown
  getItemTitle: (item: T) => string
  getItemSubtitle?: (item: T) => string | undefined
  renderDetails: (item: T) => React.ReactNode
}

const parseNumber = (value: string | boolean): number | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  return Number(value)
}

const parseJson = <T,>(value: string | boolean, fallback: T): T => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback
  }

  return JSON.parse(value) as T
}

export const userCrudConfig: CrudPageConfig<User> = {
  title: 'Users',
  description: 'Manage platform identities and role assignments for the canonical Ankuaru master data store.',
  apiBasePath: '/api/users',
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Platform Admin' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'admin@ankuaru.test' },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      required: true,
      options: ROLE_VALUES.map((value) => ({ label: value, value })),
    },
    { name: 'isActive', label: 'Active', type: 'checkbox' },
  ],
  createValues: () => ({
    name: '',
    email: '',
    role: 'admin',
    isActive: true,
  }),
  toFormValues: (item) => ({
    name: item.name,
    email: item.email ?? '',
    role: item.role,
    isActive: item.isActive,
  }),
  fromFormValues: (values) => ({
    name: values.name,
    email: values.email,
    role: values.role,
    isActive: values.isActive,
  }),
  getItemTitle: (item) => item.name,
  getItemSubtitle: (item) => `${item.role} ${item.isActive ? 'active' : 'inactive'}`,
  renderDetails: (item) => (
    <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-4">
        <dt className="font-medium text-slate-500">Email</dt>
        <dd className="mt-2">{item.email ?? 'No email set'}</dd>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <dt className="font-medium text-slate-500">Created</dt>
        <dd className="mt-2">{item.createdAt}</dd>
      </div>
    </dl>
  ),
}

export const fieldCrudConfig: CrudPageConfig<Field> = {
  title: 'Fields',
  description: 'Manage mapped farm plots using the canonical field schema and keep geometry human-editable while the app is still using dummy data.',
  apiBasePath: '/api/fields',
  fields: [
    { name: 'farmerId', label: 'Farmer user id', type: 'text', required: true, placeholder: 'user-farmer-001' },
    { name: 'name', label: 'Field name', type: 'text', required: true, placeholder: 'Konga East Plot' },
    {
      name: 'polygon',
      label: 'Polygon JSON',
      type: 'textarea',
      required: true,
      rows: 6,
      placeholder: '[{"lat": 6.18, "lng": 38.20}]',
    },
    {
      name: 'centroid',
      label: 'Centroid JSON',
      type: 'textarea',
      rows: 3,
      placeholder: '{"lat": 6.179, "lng": 38.2026}',
    },
    { name: 'areaSqm', label: 'Area sqm', type: 'number', placeholder: '8450' },
  ],
  createValues: () => ({
    farmerId: '',
    name: '',
    polygon: '[]',
    centroid: '',
    areaSqm: '',
  }),
  toFormValues: (item) => ({
    farmerId: item.farmerId,
    name: item.name,
    polygon: JSON.stringify(item.polygon, null, 2),
    centroid: item.centroid ? JSON.stringify(item.centroid, null, 2) : '',
    areaSqm: item.areaSqm?.toString() ?? '',
  }),
  fromFormValues: (values) => ({
    farmerId: values.farmerId,
    name: values.name,
    polygon: parseJson(values.polygon, [] as Array<{ lat: number; lng: number }>),
    centroid: parseJson(values.centroid, undefined as { lat: number; lng: number } | undefined),
    areaSqm: parseNumber(values.areaSqm),
  }),
  getItemTitle: (item) => item.name,
  getItemSubtitle: (item) => `Farmer ${item.farmerId}`,
  renderDetails: (item) => (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Polygon</p>
        <pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-700">
          {JSON.stringify(item.polygon, null, 2)}
        </pre>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          Centroid: {item.centroid ? `${item.centroid.lat}, ${item.centroid.lng}` : 'Not set'}
        </p>
        <p className="mt-2">Area sqm: {item.areaSqm ?? 'Not set'}</p>
      </div>
    </div>
  ),
}

export const lotCrudConfig: CrudPageConfig<Lot> = {
  title: 'Lots',
  description: 'Manage lot snapshots while preserving the event graph as the eventual source of truth for lineage.',
  apiBasePath: '/api/lots',
  fields: [
    { name: 'publicLotCode', label: 'Public lot code', type: 'text', required: true, placeholder: 'ANK-LOT-GR-001' },
    { name: 'internalUuid', label: 'Internal UUID', type: 'text', required: true, placeholder: 'uuid-value' },
    { name: 'traceKey', label: 'Trace key', type: 'text', required: true, placeholder: 'TRACE-GR-001' },
    { name: 'fieldId', label: 'Field id', type: 'text', placeholder: 'field-001' },
    { name: 'farmerId', label: 'Farmer user id', type: 'text', placeholder: 'user-farmer-001' },
    { name: 'farmId', label: 'Farm profile id', type: 'text', placeholder: 'farmer-profile-001' },
    {
      name: 'form',
      label: 'Form',
      type: 'select',
      required: true,
      options: LOT_FORM_VALUES.map((value) => ({ label: value, value })),
    },
    { name: 'weight', label: 'Weight', type: 'number', required: true, placeholder: '980' },
    { name: 'ownerId', label: 'Owner id', type: 'text', required: true, placeholder: 'user-exporter-001' },
    {
      name: 'ownerRole',
      label: 'Owner role',
      type: 'select',
      required: true,
      options: ROLE_VALUES.map((value) => ({ label: value, value })),
    },
    { name: 'custodianId', label: 'Custodian id', type: 'text', required: true, placeholder: 'user-exporter-001' },
    {
      name: 'custodianRole',
      label: 'Custodian role',
      type: 'select',
      required: true,
      options: ROLE_VALUES.map((value) => ({ label: value, value })),
    },
    {
      name: 'parentLotIds',
      label: 'Parent lot ids JSON',
      type: 'textarea',
      rows: 3,
      placeholder: '["lot-cherry-001"]',
    },
    {
      name: 'childLotIds',
      label: 'Child lot ids JSON',
      type: 'textarea',
      rows: 3,
      placeholder: '["lot-green-001"]',
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      options: LOT_STATUS_VALUES.map((value) => ({ label: value, value })),
    },
    {
      name: 'labStatus',
      label: 'Lab status',
      type: 'select',
      required: true,
      options: LAB_STATUS_VALUES.map((value) => ({ label: value, value })),
    },
    { name: 'isCollateral', label: 'Collateralized', type: 'checkbox' },
    { name: 'collateralHolderId', label: 'Collateral holder id', type: 'text', placeholder: 'user-bank-001' },
    {
      name: 'integrityStatus',
      label: 'Integrity status',
      type: 'select',
      required: true,
      options: LOT_INTEGRITY_VALUES.map((value) => ({ label: value, value })),
    },
    {
      name: 'validationStatus',
      label: 'Aggregator validation',
      type: 'select',
      required: true,
      options: LOT_VALIDATION_STATUS_VALUES.map((value) => ({ label: value, value })),
    },
    { name: 'validatedByUserId', label: 'Validated by user id', type: 'text', placeholder: 'user-aggregator-001' },
    { name: 'validatedAt', label: 'Validated at (ISO)', type: 'text', placeholder: '2026-04-01T00:00:00.000Z' },
    { name: 'observedWeight', label: 'Observed weight (kg)', type: 'number', placeholder: '0' },
    { name: 'validationNotes', label: 'Validation notes', type: 'textarea', rows: 2 },
    { name: 'quarantineReason', label: 'Quarantine reason', type: 'textarea', rows: 3 },
  ],
  createValues: () => ({
    publicLotCode: '',
    internalUuid: '',
    traceKey: '',
    fieldId: '',
    farmerId: '',
    farmId: '',
    form: 'GREEN',
    weight: '',
    ownerId: '',
    ownerRole: 'exporter',
    custodianId: '',
    custodianRole: 'exporter',
    parentLotIds: '[]',
    childLotIds: '[]',
    status: 'ACTIVE',
    labStatus: 'NOT_REQUIRED',
    isCollateral: false,
    collateralHolderId: '',
    integrityStatus: 'OK',
    validationStatus: 'VALIDATED',
    validatedByUserId: '',
    validatedAt: '',
    observedWeight: '',
    validationNotes: '',
    quarantineReason: '',
  }),
  toFormValues: (item) => ({
    publicLotCode: item.publicLotCode,
    internalUuid: item.internalUuid,
    traceKey: item.traceKey,
    fieldId: item.fieldId ?? '',
    farmerId: item.farmerId ?? '',
    farmId: item.farmId ?? '',
    form: item.form,
    weight: item.weight.toString(),
    ownerId: item.ownerId,
    ownerRole: item.ownerRole,
    custodianId: item.custodianId,
    custodianRole: item.custodianRole,
    parentLotIds: JSON.stringify(item.parentLotIds, null, 2),
    childLotIds: JSON.stringify(item.childLotIds, null, 2),
    status: item.status,
    labStatus: item.labStatus,
    isCollateral: item.isCollateral,
    collateralHolderId: item.collateralHolderId ?? '',
    integrityStatus: item.integrityStatus,
    validationStatus: item.validationStatus,
    validatedByUserId: item.validatedByUserId ?? '',
    validatedAt: item.validatedAt ?? '',
    observedWeight: item.observedWeight !== undefined ? item.observedWeight.toString() : '',
    validationNotes: item.validationNotes ?? '',
    quarantineReason: item.quarantineReason ?? '',
  }),
  fromFormValues: (values) => ({
    publicLotCode: values.publicLotCode,
    internalUuid: values.internalUuid,
    traceKey: values.traceKey,
    fieldId: values.fieldId,
    farmerId: values.farmerId,
    farmId: values.farmId,
    form: values.form,
    weight: parseNumber(values.weight),
    ownerId: values.ownerId,
    ownerRole: values.ownerRole,
    custodianId: values.custodianId,
    custodianRole: values.custodianRole,
    parentLotIds: parseJson(values.parentLotIds, [] as string[]),
    childLotIds: parseJson(values.childLotIds, [] as string[]),
    status: values.status,
    labStatus: values.labStatus,
    isCollateral: values.isCollateral,
    collateralHolderId: values.collateralHolderId,
    integrityStatus: values.integrityStatus,
    validationStatus: values.validationStatus,
    validatedByUserId: values.validatedByUserId,
    validatedAt: values.validatedAt,
    observedWeight: parseNumber(values.observedWeight),
    validationNotes: values.validationNotes,
    quarantineReason: values.quarantineReason,
  }),
  getItemTitle: (item) => item.publicLotCode,
  getItemSubtitle: (item) => `${item.form} • ${item.status}`,
  renderDetails: (item) => (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p>Trace key: {item.traceKey}</p>
        <p className="mt-2">Owner: {item.ownerRole} / {item.ownerId}</p>
        <p className="mt-2">Custodian: {item.custodianRole} / {item.custodianId}</p>
        <p className="mt-2">Collateral: {item.isCollateral ? 'Yes' : 'No'}</p>
        <Link
          href={`/lots/${item.id}`}
          className="mt-4 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          View event timeline
        </Link>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-500">Lineage</p>
        <pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-700">
          {JSON.stringify(
            {
              parentLotIds: item.parentLotIds,
              childLotIds: item.childLotIds,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  ),
}

export const crudAdminConfigMap = {
  users: userCrudConfig,
  fields: fieldCrudConfig,
  lots: lotCrudConfig,
} as const

export type CrudAdminScreenName = keyof typeof crudAdminConfigMap

export const adminSections = [
  {
    href: '/admin/bank-onboarding',
    label: 'Bank onboarding',
    detail: 'Applicant financial / background reviews (simulator)',
  },
  {
    href: '/admin/users',
    label: 'Users',
    detail: 'Identity and role management',
  },
  {
    href: '/admin/fields',
    label: 'Fields',
    detail: 'Mapped farm plots and geometry',
  },
  {
    href: '/admin/lots',
    label: 'Lots',
    detail: 'Current-state lot snapshots',
  },
  {
    href: '/admin/inventory/dashboard',
    label: 'Inventory',
    detail: 'Summary cards and Recharts views',
  },
  {
    href: '/admin/performance',
    label: 'Performance',
    detail: 'Simulated actor scores (timeliness, accuracy, quality)',
  },
  {
    href: '/admin/integrity',
    label: 'Integrity',
    detail: 'Ledger truth checks and quarantine summary',
  },
  {
    href: '/admin/role-monitor',
    label: 'Role monitor',
    detail: 'Isolated role previews and session sandbox',
  },
] as const

export function AdminSectionLinks() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {adminSections.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="rounded-[2rem] border border-slate-200/90 bg-white p-5 shadow-lg shadow-slate-900/10 ring-2 ring-white/80 transition hover:-translate-y-0.5 hover:border-amber-200/60 hover:shadow-xl"
        >
          <p className="text-xl font-semibold text-slate-950">{section.label}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{section.detail}</p>
        </Link>
      ))}
    </div>
  )
}
