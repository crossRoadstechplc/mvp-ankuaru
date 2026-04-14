import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CreateAggregationWorkspace } from '@/components/aggregator/create-aggregation-workspace'
import { btnCtaAmberClass, btnPrimaryClass, btnSecondaryClass } from '@/components/ui/button-styles'
import type { Role } from '@/lib/domain/types'
import { findRoleAction, getRoleCapability } from '@/lib/roles/capabilities'

const isRole = (value: string): value is Role =>
  [
    'farmer',
    'aggregator',
    'processor',
    'transporter',
    'lab',
    'exporter',
    'importer',
    'bank',
    'admin',
    'regulator',
  ].includes(value)

export default async function RoleActionPage({
  params,
  searchParams,
}: {
  params: Promise<{ action: string }> | { action: string }
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const roleParam = resolvedSearchParams.role
  const roleValue = Array.isArray(roleParam) ? roleParam[0] : roleParam
  const role = roleValue && isRole(roleValue) ? roleValue : undefined

  if (!role) {
    notFound()
  }

  const capability = getRoleCapability(role)
  const action = findRoleAction(role, resolvedParams.action as never)

  if (!action) {
    notFound()
  }

  if (resolvedParams.action === 'create-aggregation' && role === 'aggregator') {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Aggregator action</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{action.label}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{action.description}</p>
        </header>
        <CreateAggregationWorkspace />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
          {capability.label} action
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{action.label}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-700">{action.description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={action.href} className={btnCtaAmberClass}>
            Open workflow
          </Link>
          <Link href="/" className={btnSecondaryClass}>
            Home dashboard
          </Link>
        </div>
        {role === 'admin' ? (
          <div className="mt-4">
            <Link href="/admin" className={btnPrimaryClass}>
              Admin overview
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
