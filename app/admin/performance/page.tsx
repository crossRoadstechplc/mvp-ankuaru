import { AdminPerformanceTable } from '@/components/performance/admin-performance-table'
import { computeAllActorPerformances } from '@/lib/performance/actor-ratings'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminPerformancePage() {
  const store = await initializeLiveDataStore()
  const ratings = computeAllActorPerformances(store)

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Admin</p>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Actor performance</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Demo scores combine simulated timeliness (ledger gaps), accuracy (mass balance and participation), and quality
          adherence (lab outcomes and transport completion). Use with seeded data for stakeholder walkthroughs.
        </p>
      </header>
      <AdminPerformanceTable ratings={ratings} users={store.users} />
    </div>
  )
}
