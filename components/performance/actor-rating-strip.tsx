import type { ActorPerformanceBreakdown } from '@/lib/performance/actor-ratings'

type Props = {
  rating: ActorPerformanceBreakdown
  /** Compact row for dashboards; full shows dimension labels. */
  variant?: 'compact' | 'full'
}

const bar = (label: string, value: number) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs text-slate-600">
      <span>{label}</span>
      <span className="font-mono font-medium text-slate-900">{value}</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-[width]"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
)

export function ActorRatingStrip({ rating, variant = 'compact' }: Props) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
      data-testid="actor-rating-strip"
      data-composite-score={rating.compositeScore}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Simulated performance</p>
        <p className="text-lg font-semibold tabular-nums text-slate-950">{rating.compositeScore}</p>
      </div>
      <p className="mt-1 text-xs text-slate-500">Composite of timeliness, accuracy, and quality adherence (demo).</p>
      {variant === 'full' ? (
        <div className="mt-4 space-y-3">
          {bar('Timeliness', rating.timelinessScore)}
          {bar('Accuracy', rating.accuracyScore)}
          {bar('Quality adherence', rating.qualityAdherenceScore)}
        </div>
      ) : null}
    </div>
  )
}
