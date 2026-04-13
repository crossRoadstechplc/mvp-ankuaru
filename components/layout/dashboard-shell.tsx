'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HiArrowLongLeft, HiArrowLongRight } from 'react-icons/hi2'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { PageBackBar } from '@/components/layout/page-back-bar'

export type DashboardNavItem = {
  href: string
  label: string
}

type DashboardShellProps = {
  /** Short label shown above the nav (workspace name). */
  workspace: string
  /** Optional one-line context under the workspace label. */
  workspaceHint?: string
  navItems: DashboardNavItem[]
  /** Rendered at the top of the main column (page intros, etc.). */
  intro?: ReactNode
  /** Primary section root for the back bar (e.g. `/trade`). */
  sectionHomeHref: string
  sectionHomeLabel: string
  /** When true, suppresses the standard back bar (used on `/`). */
  hideBackBar?: boolean
  children: ReactNode
}

const linkClass = (active: boolean) =>
  [
    'block rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-200/80'
      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
  ].join(' ')

const isNavActive = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function DashboardShell({
  workspace,
  workspaceHint,
  navItems,
  intro,
  sectionHomeHref,
  sectionHomeLabel,
  hideBackBar,
  children,
}: DashboardShellProps) {
  const pathname = usePathname() ?? ''
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-slate-50/80 md:flex-row">
      {sidebarOpen ? (
        <aside className="flex w-full shrink-0 flex-col border-b border-slate-200 bg-white md:w-60 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 sm:px-4 md:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace menu</p>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              aria-label="Hide sidebar"
              title="Hide sidebar"
            >
              <HiArrowLongLeft aria-hidden="true" className="size-5 stroke-2" />
            </button>
          </div>
          <div className="px-3 py-4 sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{workspace}</p>
          {workspaceHint ? <p className="mt-1 text-xs leading-snug text-slate-600">{workspaceHint}</p> : null}
          <nav className="mt-4 flex max-w-full flex-col gap-0.5" aria-label="Workspace">
            <Link href="/" className={linkClass(isNavActive(pathname, '/'))}>
              Dashboard home
            </Link>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(isNavActive(pathname, item.href))}>
                {item.label}
              </Link>
            ))}
          </nav>
          </div>
        </aside>
      ) : null}
      <main className="min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-auto px-3 py-5 sm:px-5 md:px-6 lg:px-8">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? (
              <HiArrowLongLeft aria-hidden="true" className="size-5 stroke-2" />
            ) : (
              <HiArrowLongRight aria-hidden="true" className="size-5 stroke-2" />
            )}
          </button>
        </div>
        <PageBackBar
          hidden={hideBackBar}
          sectionHomeHref={sectionHomeHref}
          sectionHomeLabel={sectionHomeLabel}
        />
        {intro ? <div className="mb-8">{intro}</div> : null}
        {children}
      </main>
    </div>
  )
}
