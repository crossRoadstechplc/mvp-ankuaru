import { LotValidationHub } from '@/components/aggregator/lot-validation-hub'
import {
  collapsibleBodyClass,
  collapsibleChevronClass,
  collapsibleDetailsClass,
  collapsibleSummaryClass,
} from '@/lib/ui/collapsible-styles'

export default function AggregatorLotValidationPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <details open className={collapsibleDetailsClass}>
        <summary className={collapsibleSummaryClass}>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Aggregator</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Lot validation</h1>
          </div>
          <span className={collapsibleChevronClass} aria-hidden>
            ▼
          </span>
        </summary>
        <div className={collapsibleBodyClass}>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Review farmer-declared cherry lots before they can be used as sources in aggregation.
          </p>
          <div className="mt-6">
            <LotValidationHub />
          </div>
        </div>
      </details>
    </div>
  )
}
