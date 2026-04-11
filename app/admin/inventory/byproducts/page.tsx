import Link from 'next/link'

import { summarizeByproductInventory } from '@/lib/lots/byproduct-inventory'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function ByproductInventoryPage() {
  const store = await initializeLiveDataStore()
  const rows = summarizeByproductInventory(store)

  return (
    <div className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8">
      <Link
        href="/admin/lots"
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline"
      >
        ← Back to lots admin
      </Link>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-slate-950">Byproduct inventory</h1>
        <Link
          href="/admin/inventory/dashboard"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-950"
        >
          Full inventory dashboard
        </Link>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Totals aggregate lots with <code className="rounded bg-slate-100 px-1 text-xs">form: BYPRODUCT</code> and a{' '}
        <code className="rounded bg-slate-100 px-1 text-xs">byproductKind</code> from the processing engine.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">No classified byproduct lots in the store yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700">Class</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Lots</th>
                <th className="px-4 py-3 font-semibold text-slate-700">Total kg</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.kind} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-950">{row.label}</td>
                  <td className="px-4 py-3 text-slate-700">{row.lotCount}</td>
                  <td className="px-4 py-3 text-slate-700">{row.totalKg.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
