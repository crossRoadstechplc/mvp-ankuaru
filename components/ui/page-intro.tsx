import type { ReactNode } from 'react'

export const pageEyebrowClass = 'text-sm font-medium uppercase tracking-[0.24em] text-slate-500'
export const pageTitleClass = 'text-3xl font-semibold tracking-tight text-slate-950'
export const pageLeadClass = 'mt-3 max-w-2xl text-sm leading-6 text-slate-600'

type PageIntroProps = {
  eyebrow?: string
  title: string
  lead?: string
  children?: ReactNode
  className?: string
}

/**
 * Standard page header: optional workspace label, title, lead paragraph.
 */
export function PageIntro({ eyebrow, title, lead, children, className }: PageIntroProps) {
  return (
    <header className={className}>
      {eyebrow ? <p className={pageEyebrowClass}>{eyebrow}</p> : null}
      <h1 className={`${pageTitleClass} ${eyebrow ? 'mt-2' : ''}`}>{title}</h1>
      {lead ? <p className={pageLeadClass}>{lead}</p> : null}
      {children}
    </header>
  )
}
