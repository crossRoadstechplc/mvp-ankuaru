import Link from 'next/link'

import { EntityAdminScreen } from '@/components/crud/entity-admin-screen'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminLotsPage() {
  const store = await initializeLiveDataStore()

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/admin/lots/aggregate"
          className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950"
        >
          Aggregate lots
        </Link>
        <Link
          href="/admin/lots/disaggregate"
          className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-950"
        >
          Disaggregate lot
        </Link>
        <Link
          href="/admin/lots/process"
          className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-950"
        >
          Record processing
        </Link>
        <Link
          href="/admin/inventory/byproducts"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800"
        >
          Byproduct inventory
        </Link>
      </div>
      <EntityAdminScreen screen="lots" items={store.lots} />
    </div>
  )
}
