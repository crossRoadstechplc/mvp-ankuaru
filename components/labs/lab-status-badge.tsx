import type { LabStatus } from '@/lib/domain/types'

const STYLE: Record<
  LabStatus,
  { label: string; className: string }
> = {
  NOT_REQUIRED: {
    label: 'Lab not required',
    className: 'bg-slate-100 text-slate-800 ring-slate-200',
  },
  PENDING: {
    label: 'Pending',
    className: 'bg-amber-100 text-amber-950 ring-amber-200',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-950 ring-emerald-200',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-rose-100 text-rose-950 ring-rose-200',
  },
}

type LabStatusBadgeProps = {
  status: LabStatus
  className?: string
}

export function LabStatusBadge({ status, className = '' }: LabStatusBadgeProps) {
  const cfg = STYLE[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${cfg.className} ${className}`.trim()}
    >
      {cfg.label}
    </span>
  )
}
