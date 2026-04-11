import { InventorySummaryCards } from '@/components/inventory/inventory-summary-cards'
import { computeInventorySummary } from '@/lib/inventory/inventory-summary'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function InventoryDashboardPage() {
  const store = await initializeLiveDataStore()
  const summary = computeInventorySummary(store)

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Inventory</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-950">Rollups</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Snapshot and PROCESS-derived totals for demo review. Same numbers as the ledger-backed inventory helpers.
        </p>
      </header>

      <InventorySummaryCards summary={summary} />
    </div>
  )
}
