import type { InventorySummary } from '@/lib/inventory/inventory-summary'

type InventorySummaryCardsProps = {
  summary: InventorySummary
}

export function InventorySummaryCards({ summary }: InventorySummaryCardsProps) {
  const topStage = [...summary.lotsByStage].sort((a, b) => b.totalWeightKg - a.totalWeightKg)[0]

  return (
    <section aria-labelledby="inventory-cards-heading" className="space-y-4">
      <h2 id="inventory-cards-heading" className="sr-only">
        Inventory summary metrics
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Inventory by stage</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{summary.lotsByStage.length}</p>
          <p className="mt-2 text-sm text-slate-600">
            Stages with stock
            {topStage ? (
              <>
                {' '}
                · heaviest: <span className="font-medium text-slate-800">{topStage.label}</span> (
                {topStage.totalWeightKg.toFixed(1)} kg)
              </>
            ) : null}
          </p>
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Active lots</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{summary.activeLotCount}</p>
          <p className="mt-2 text-sm text-slate-600">Active, in transit, lab, processing, or export-ready.</p>
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Main product weight</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary.totalMainProductWeightKg.toFixed(1)} kg
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Snapshots (non-BYPRODUCT). Ledger PROCESS main output:{' '}
            <span className="font-medium">{summary.processMass.totalMainOutputKg.toFixed(1)} kg</span>
          </p>
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Byproduct totals</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {summary.totalByproductLotWeightKg.toFixed(1)} kg
          </p>
          <p className="mt-2 text-sm text-slate-600">
            BYPRODUCT lots (snapshots). Ledger streams:{' '}
            <span className="font-medium">{summary.processMass.totalByproductStreamKg.toFixed(1)} kg</span>
          </p>
        </article>
      </div>

      {summary.imbalanceWarnings.length > 0 ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          <p className="font-semibold">Mass balance warnings</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {summary.imbalanceWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
