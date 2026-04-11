'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

type PageBackBarProps = {
  /** When `true`, no back bar is rendered (e.g. main role dashboard at `/`). */
  hidden?: boolean
  /** Section root (e.g. `/trade`). Shown as a quick link when not already on this path. */
  sectionHomeHref: string
  sectionHomeLabel: string
}

export function PageBackBar({ hidden, sectionHomeHref, sectionHomeLabel }: PageBackBarProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''

  if (hidden || pathname === '/') {
    return null
  }

  const atSectionRoot = pathname === sectionHomeHref

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    void router.push(atSectionRoot ? '/' : sectionHomeHref)
  }

  return (
    <div
      className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4"
      data-testid="page-back-bar"
    >
      <button
        type="button"
        onClick={() => void goBack()}
        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
      >
        ← Back
      </button>
      {!atSectionRoot ? (
        <Link
          href={sectionHomeHref}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          {sectionHomeLabel}
        </Link>
      ) : null}
    </div>
  )
}
