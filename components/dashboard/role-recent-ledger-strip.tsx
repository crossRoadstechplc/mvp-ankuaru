'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { CollapsibleSection } from '@/components/ui/collapsible-section'
import type { LiveDataStore, Role } from '@/lib/domain/types'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'
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
    <CollapsibleSection
      dataTestId="role-home-recent-ledger"
      containerClassName={accent.section}
      kicker={copy.kicker}
      kickerClassName={accent.kicker}
      title={copy.title}
      description={copy.blurb}
      defaultOpen
    >
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">No matching ledger rows for this role yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.map((row) => (
            <li key={row.key} className="rounded-xl border border-black/5 bg-white/90 px-4 py-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-slate-500">{formatDisplayTimestamp(row.timestamp)}</span>
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
      <p className="mt-4 text-xs text-slate-600">
        Full snapshot: use{' '}
        <Link href="/discovery" className={`font-medium underline-offset-2 hover:underline ${accent.link}`}>
          Discovery
        </Link>{' '}
        for cross-role browsing.
      </p>
    </CollapsibleSection>
  )
}
