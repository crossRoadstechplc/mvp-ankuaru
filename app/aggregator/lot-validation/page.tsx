import { LotValidationHub } from '@/components/aggregator/lot-validation-hub'

export default function AggregatorLotValidationPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Aggregator</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Lot validation</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Review farmer-declared cherry lots before they can be used as sources in aggregation.
        </p>
      </header>
      <LotValidationHub />
    </div>
  )
}
