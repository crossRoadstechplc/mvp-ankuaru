import type { Trade } from '@/lib/domain/types'

type TradeFinancingBadgesProps = {
  trade: Pick<Trade, 'bankApproved' | 'marginLocked' | 'marginPercent'>
  /** True when linked lots are flagged as collateral (simulator). */
  collateralActive?: boolean
}

/**
 * Visual indicators for bank approval, margin lock, and collateral (trade + optional lot-level collateral).
 */
export function TradeFinancingBadges({ trade, collateralActive = false }: TradeFinancingBadgesProps) {

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
          trade.bankApproved
            ? 'bg-emerald-100 text-emerald-950 ring-emerald-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
      >
        {trade.bankApproved ? 'Bank approved' : 'Bank pending'}
      </span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
          trade.marginLocked
            ? 'bg-amber-100 text-amber-950 ring-amber-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
      >
        {trade.marginLocked
          ? `Margin locked${trade.marginPercent != null ? ` (${trade.marginPercent}%)` : ''}`
          : 'Margin not locked'}
      </span>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
          collateralActive
            ? 'bg-violet-100 text-violet-950 ring-violet-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
      >
        {collateralActive ? 'Collateral active' : 'Collateral inactive'}
      </span>
    </div>
  )
}
