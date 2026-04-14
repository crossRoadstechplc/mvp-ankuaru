'use client'

import { useState, type ReactNode } from 'react'

import {
  collapsibleBodyClass,
  collapsibleChevronClass,
  collapsibleDetailsClass,
  collapsibleSummaryClass,
} from '@/lib/ui/collapsible-styles'

export type CollapsibleSectionProps = {
  id?: string
  kicker?: string
  /** Tailwind classes for the kicker line (defaults to slate). */
  kickerClassName?: string
  title: string
  description?: string
  defaultOpen?: boolean
  summaryAddon?: ReactNode
  children: ReactNode
  /** Merged after the default panel surface (borders, radius, shadow). */
  className?: string
  /** When set, replaces the default white panel surface — use for role-tinted strips (e.g. ledger). */
  containerClassName?: string
  dataTestId?: string
}

/**
 * Controlled `<details>` so default-open state stays consistent with other dashboard panels.
 */
export function CollapsibleSection({
  id,
  kicker,
  kickerClassName,
  title,
  description,
  defaultOpen = true,
  summaryAddon,
  children,
  className,
  containerClassName,
  dataTestId,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const surface = containerClassName ?? collapsibleDetailsClass

  return (
    <details
      id={id}
      data-testid={dataTestId ?? undefined}
      className={`group scroll-mt-8 ${surface} ${className ?? ''}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className={collapsibleSummaryClass}>
        <div className="min-w-0 flex-1">
          {kicker ? (
            <p
              className={`text-sm font-medium uppercase tracking-[0.24em] ${kickerClassName ?? 'text-slate-500'}`}
            >
              {kicker}
            </p>
          ) : null}
          <h2 className={`text-xl font-semibold text-slate-950 sm:text-2xl ${kicker ? 'mt-1' : ''}`}>{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {summaryAddon}
          <span className={collapsibleChevronClass} aria-hidden>
            ▼
          </span>
        </div>
      </summary>
      <div className={collapsibleBodyClass}>{children}</div>
    </details>
  )
}
