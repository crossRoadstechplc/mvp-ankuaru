import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ValidateLotFormClient } from '@/components/aggregator/validate-lot-form-client'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AggregatorValidateLotPage({
  params,
}: {
  params: Promise<{ lotId: string }> | { lotId: string }
}) {
  const resolved = await params
  const store = await initializeLiveDataStore()
  const lot = store.lots.find((l) => l.id === resolved.lotId)
  if (!lot) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/aggregator/lot-validation"
          className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
        >
          ← Lot validation
        </Link>
      </div>
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-mono text-sm text-slate-500">{lot.publicLotCode}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Validate lot</h1>
        <p className="mt-2 text-sm text-slate-600">
          Status: <strong>{lot.validationStatus}</strong>
        </p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ValidateLotFormClient lot={lot} />
      </section>
    </div>
  )
}
