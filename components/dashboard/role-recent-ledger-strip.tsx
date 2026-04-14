'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import type { LiveDataStore, Role } from '@/lib/domain/types'
import {
  getRoleHomeLedgerRows,
  roleHomeLedgerAccent,
  roleHomeLedgerCopy,
} from '@/lib/roles/role-home-ledger'
import { btnCtaOpenCompactClass } from '@/components/ui/button-styles'

type RoleRecentLedgerStripProps = {
  role: Role
  store: LiveDataStore
  selectedUserId: string | null | undefined
}

export function RoleRecentLedgerStrip({ role, store, selectedUserId }: RoleRecentLedgerStripProps) {
  const rows = useMemo(
    () => getRoleHomeLedgerRows(role, store, selectedUserId),
    [role, store, selectedUserId],
  )
  const copy = roleHomeLedgerCopy(role)
  const accent = roleHomeLedgerAccent(role)

  return (
    <section className={accent.section} data-testid="role-home-recent-ledger">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`text-sm font-medium uppercase tracking-[0.24em] ${accent.kicker}`}>{copy.kicker}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{copy.title}</h2>
          {copy.blurb ? <p className="mt-2 max-w-2xl text-sm text-slate-700">{copy.blurb}</p> : null}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">No matching ledger rows for this role yet.</p>
      ) : (
        <ul className="mt-5 space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.key} className="rounded-xl border border-black/5 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-slate-500">{row.timestamp.slice(0, 19)}Z</span>
                  <p className="mt-1 font-semibold text-slate-950">{row.title}</p>
                  <p className="mt-0.5 text-slate-600">{row.detail}</p>
                </div>
                <Link href={row.href} className={`${btnCtaOpenCompactClass} shrink-0`}>
                  {row.linkLabel}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-4 text-xs text-slate-600`}>
        Full snapshot: use <Link href="/discovery" className={`font-medium underline-offset-2 hover:underline ${accent.link}`}>Discovery</Link> for
        cross-role browsing.
      </p>
    </section>
  )
}
