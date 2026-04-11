import Link from 'next/link'

const STEPS: readonly { id: string; label: string; href?: string }[] = [
  { id: 'farmer', label: 'Farmer origin', href: '/farmer/lots' },
  { id: 'validate', label: 'Aggregator validation', href: '/aggregator/lot-validation' },
  { id: 'aggregate', label: 'Aggregation', href: '/actions/create-aggregation?role=aggregator' },
  { id: 'process', label: 'Processor', href: '/processor/record' },
  { id: 'lab', label: 'Lab', href: '/lab' },
  { id: 'transport', label: 'Transport', href: '/transport' },
  { id: 'trade', label: 'Trade', href: '/trade' },
  { id: 'bank', label: 'Bank', href: '/bank' },
  { id: 'delivery', label: 'Delivery', href: '/trade/delivery' },
  { id: 'settlement', label: 'Settlement', href: '/trade' },
  { id: 'trace', label: 'Traceability', href: '/lots/lot-green-001' },
]

/**
 * Read-only story strip for demos: end-to-end lot journey (not all roles can act on every step).
 */
export function LotLifecycleStrip() {
  return (
    <section
      className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm"
      aria-label="Coffee lot journey"
      data-testid="lot-lifecycle-strip"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-900/80">Lot journey</p>
      <p className="mt-1 text-sm text-slate-700">
        End-to-end flow in the MVP — your role uses the steps that apply; open any step to explore.
      </p>
      <ol className="mt-4 flex flex-wrap gap-x-1 gap-y-2 text-sm text-slate-800">
        {STEPS.map((step, i) => (
          <li key={step.id} className="flex flex-wrap items-center gap-1">
            {i > 0 ? <span className="text-slate-300" aria-hidden="true">→</span> : null}
            {step.href ? (
              <Link
                href={step.href}
                className="rounded-full bg-white/90 px-2.5 py-1 text-sm font-medium text-amber-950 ring-1 ring-amber-200/80 hover:bg-amber-100/80"
              >
                {step.label}
              </Link>
            ) : (
              <span className="rounded-full bg-white/60 px-2.5 py-1 ring-1 ring-slate-200/80">{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
