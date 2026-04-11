import type { SummaryCardData } from '@/lib/summary'

type SummaryCardProps = {
  card: SummaryCardData
}

export function SummaryCard({ card }: SummaryCardProps) {
  return (
    <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
        {card.label}
      </p>
      <p className="mt-3 text-4xl font-semibold text-slate-950">{card.value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{card.detail}</p>
    </article>
  )
}
