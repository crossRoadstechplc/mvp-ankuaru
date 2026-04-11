'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { AggregateLotsForm } from '@/components/lots/aggregate-lots-form'

export default function AdminAggregateLotsPage() {
  const router = useRouter()

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/admin/lots"
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline"
      >
        ← Back to lots admin
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-950">Aggregate lots</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Select two or more source lots, then create a single aggregated output lot. An{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">AGGREGATE</code> event is appended and lineage is
        linked on all affected records.
      </p>
      <div className="mt-8">
        <AggregateLotsForm onSuccess={(lotId) => router.push(`/lots/${lotId}`)} />
      </div>
    </div>
  )
}
