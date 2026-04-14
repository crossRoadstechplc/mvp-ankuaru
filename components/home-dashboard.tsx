'use client'

import Link from 'next/link'
import { useEffect, useMemo } from 'react'

import { ROLE_VALUES } from '@/lib/domain/constants'
import type { LiveDataStore } from '@/lib/domain/types'
import { buildRoleDashboardView } from '@/lib/roles/dashboard'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'
import { LotValidationHub } from '@/components/aggregator/lot-validation-hub'
import { RoleRecentLedgerStrip } from '@/components/dashboard/role-recent-ledger-strip'
import { lotIsFarmerOriginHeldAtFarm } from '@/lib/lots/lot-validation-gates'
import { btnCtaAmberClass, btnCtaOpenCompactClass, btnSecondaryClass } from '@/components/ui/button-styles'

import { RoleSwitcher } from './role-switcher'

type HomeDashboardProps = {
  store: LiveDataStore
}

export function HomeDashboard({ store }: HomeDashboardProps) {
  const sessionRole = useSessionStore((state) => state.currentUserRole)
  const sessionUserId = useSessionStore((state) => state.currentUserId)
  const isAdminSession = sessionRole === 'admin'

  const selectedRole = useUiStore((state) => state.selectedRole)
  const selectedUserId = useUiStore((state) => state.selectedUserId)
  const setSelectedRole = useUiStore((state) => state.setSelectedRole)
  const setSelectedUserId = useUiStore((state) => state.setSelectedUserId)

  useEffect(() => {
    if (!sessionRole || !sessionUserId) {
      return
    }
    if (!isAdminSession) {
      setSelectedRole(sessionRole)
      setSelectedUserId(sessionUserId)
    }
  }, [sessionRole, sessionUserId, isAdminSession, setSelectedRole, setSelectedUserId])

  useEffect(() => {
    if (!isAdminSession || !sessionUserId) {
      return
    }
    setSelectedRole('admin')
    setSelectedUserId(sessionUserId)
  }, [isAdminSession, sessionUserId, setSelectedRole, setSelectedUserId])

  const usersForSelectedRole = store.users.filter((user) => user.role === selectedRole)

  useEffect(() => {
    if (!isAdminSession) {
      return
    }
    const matchingUser = usersForSelectedRole.find((user) => user.id === selectedUserId)
    if (matchingUser) {
      return
    }

    setSelectedUserId(usersForSelectedRole[0]?.id ?? null)
  }, [isAdminSession, selectedUserId, setSelectedUserId, usersForSelectedRole])

  if (!sessionRole || !sessionUserId) {
    return null
  }

  const roleView = buildRoleDashboardView(store, selectedRole, selectedUserId)
  const selectedUser =
    usersForSelectedRole.find((user) => user.id === selectedUserId) ?? roleView.selectedUser

  const firstAction = roleView.actions[0]
  const firstModule = roleView.modules[0]
  const showAggregatorValidationFirst = selectedRole === 'aggregator'
  const pendingFarmerValidationCount = useMemo(
    () =>
      store.lots.filter((lot) => lotIsFarmerOriginHeldAtFarm(lot) && lot.validationStatus === 'PENDING').length,
    [store.lots],
  )

  return (
    <div className="flex w-full max-w-none flex-col gap-8">
        {isAdminSession ? (
          <RoleSwitcher
            roles={ROLE_VALUES}
            selectedRole={selectedRole}
            selectedUserName={selectedUser?.name}
            onRoleChange={(role) => {
              setSelectedRole(role)
              setSelectedUserId(store.users.find((user) => user.role === role)?.id ?? null)
            }}
          />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-black/5">
            <p className="text-sm text-slate-700">
              Signed in as <strong className="text-slate-950">{sessionRole}</strong>. Use the sidebar for your workspace;
              open <strong>Discovery</strong> from any screen. To try another role, sign in as a different user.
            </p>
          </section>
        )}

        {showAggregatorValidationFirst ? (
          <details
            className="group rounded-[2rem] border border-amber-200 bg-amber-50/40 p-6 shadow-sm shadow-black/5 open:shadow-md open:ring-1 open:ring-amber-300/40"
            defaultOpen={pendingFarmerValidationCount > 0}
          >
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-800">Aggregator priority</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">Lot validation</h2>
                  <p className="mt-2 text-sm text-slate-700">
                    Validate farmer-origin picks first. Cleared lots then appear in aggregation workflows.
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  {pendingFarmerValidationCount > 0 ? (
                    <span className="rounded-full bg-amber-700 px-3 py-1 text-xs font-bold text-white shadow-md shadow-amber-900/25 ring-1 ring-amber-950/20">
                      {pendingFarmerValidationCount} awaiting
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-200/80 bg-white/80 px-3 py-1 text-xs font-semibold text-amber-900/90 shadow-sm">
                      No new farmer picks to validate
                    </span>
                  )}
                  <span
                    className="select-none text-lg leading-none text-amber-900 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  >
                    ▼
                  </span>
                </div>
              </div>
            </summary>
            <div className="mt-6 border-t border-amber-200/60 pt-6">
              <LotValidationHub />
            </div>
          </details>
        ) : null}

        <section
          className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5"
          data-testid="role-dashboard-main"
        >
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Your workspace</p>
          <h2 className="mt-2 text-3xl font-semibold capitalize text-slate-950">{roleView.capability.label}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{roleView.capability.description}</p>
          <p className="mt-2 text-sm text-slate-600">
            Active user: <span className="font-medium text-slate-900">{selectedUser?.name ?? '—'}</span>
          </p>
          {roleView.capability.isReadOnly ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
              Read-only workspace: browse Discovery and linked lots; no edits or ledger changes.
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start here</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {firstAction ? (
                  <Link href={firstAction.href} className={btnCtaAmberClass}>
                    {firstAction.label}
                  </Link>
                ) : roleView.capability.isReadOnly ? (
                  <Link href="/discovery" className={btnCtaAmberClass}>
                    Discovery (read-only)
                  </Link>
                ) : (
                  'Open Discovery or a focus area below'
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What matters now</p>
              <p className="mt-2 text-sm text-slate-800">{firstModule?.summary ?? 'Live data from the store snapshot.'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Where next</p>
              <p className="mt-2 text-sm text-slate-800">
                Sidebar links for your role, plus{' '}
                <Link href="/discovery" className={btnSecondaryClass}>
                  Discovery
                </Link>{' '}
                everywhere.
              </p>
            </div>
          </div>

          {!roleView.capability.isReadOnly && roleView.actions.length > 1 ? (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <p className="text-sm font-medium text-slate-700">More actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {roleView.actions.slice(1).map((action) => (
                  <Link key={action.id} href={action.href} className={btnSecondaryClass}>
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <RoleRecentLedgerStrip role={selectedRole} store={store} selectedUserId={selectedUserId} />

        <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Focus areas</p>
            <h3 className="text-lg font-semibold text-slate-950">Live data for this role</h3>
            <p className="text-sm text-slate-600">Up to four panels from the current store. Expand a row for detail.</p>
          </div>

          <div className="mt-5 space-y-3">
            {roleView.modules.map((module, index) => (
              <details
                key={module.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                open={index === 0}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-950">{module.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{module.summary}</p>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{module.items.length} items</p>
                  </div>
                </summary>

                <div className="mt-4 grid gap-3">
                  {module.items.length === 0 ? (
                    <div className="rounded-2xl bg-white p-4 text-sm text-slate-600">Nothing seeded for this view.</div>
                  ) : (
                    module.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-slate-950">{item.label}</p>
                            <p className="mt-1 text-slate-600">{item.detail}</p>
                          </div>
                          {item.href ? (
                            <Link href={item.href} className={`${btnCtaOpenCompactClass} shrink-0`}>
                              Open
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
  )
}
