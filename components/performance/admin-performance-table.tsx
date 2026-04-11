import type { ActorPerformanceBreakdown } from '@/lib/performance/actor-ratings'
import type { User } from '@/lib/domain/types'

type Props = {
  ratings: ActorPerformanceBreakdown[]
  users: User[]
}

export function AdminPerformanceTable({ ratings, users }: Props) {
  const nameById = new Map(users.map((u) => [u.id, u.name]))

  return (
    <div className="overflow-x-auto rounded-[2rem] border border-black/10 bg-white shadow-sm" data-testid="admin-performance-table">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">Timeliness</th>
            <th className="px-4 py-3 font-medium">Accuracy</th>
            <th className="px-4 py-3 font-medium">Quality</th>
            <th className="px-4 py-3 font-medium">Composite</th>
          </tr>
        </thead>
        <tbody>
          {ratings.map((r) => (
            <tr key={r.userId} className="border-b border-slate-100">
              <td className="px-4 py-3 font-medium text-slate-900">{nameById.get(r.userId) ?? r.userId}</td>
              <td className="px-4 py-3 font-mono tabular-nums">{r.timelinessScore}</td>
              <td className="px-4 py-3 font-mono tabular-nums">{r.accuracyScore}</td>
              <td className="px-4 py-3 font-mono tabular-nums">{r.qualityAdherenceScore}</td>
              <td className="px-4 py-3 font-mono font-semibold tabular-nums text-emerald-800">{r.compositeScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
