import type { Trade } from '@/lib/domain/types'

type Props = {
  trade: Pick<
    Trade,
    | 'status'
    | 'bankApproved'
    | 'marginLocked'
    | 'marginCallAt'
    | 'defaultedAt'
    | 'liquidatedAt'
    | 'settlementCompletedAt'
    | 'bankRepaidSimulator'
  >
}

const chip = (on: boolean, label: string, onCls: string) => (
  <span
    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
      on ? onCls : 'bg-slate-100 text-slate-500 ring-slate-200'
    }`}
  >
    {label}
  </span>
)

const postDelivery = new Set<Trade['status']>(['DELIVERED', 'SETTLED', 'MARGIN_CALL', 'DEFAULTED', 'LIQUIDATED'])

/**
 * Lifecycle chips for financed trades: financed → in transit → delivered → settled / margin call / default / liquidation.
 */
export function TradeLifecycleBadges({ trade }: Props) {
  const financed = Boolean(trade.bankApproved && trade.marginLocked)
  const inTransit = trade.status === 'IN_TRANSIT'
  const delivered = postDelivery.has(trade.status)
  const settled = trade.status === 'SETTLED'
  const marginCall = trade.status === 'MARGIN_CALL'
  const defaulted = trade.status === 'DEFAULTED'
  const liquidated = trade.status === 'LIQUIDATED'

  return (
    <div className="flex flex-wrap gap-2">
      {chip(financed, 'Financed', 'bg-indigo-100 text-indigo-950 ring-indigo-200')}
      {chip(inTransit, 'In transit', 'bg-sky-100 text-sky-950 ring-sky-200')}
      {chip(delivered, 'Delivered', 'bg-teal-100 text-teal-950 ring-teal-200')}
      {chip(settled, 'Settled', 'bg-emerald-100 text-emerald-950 ring-emerald-200')}
      {chip(marginCall, 'Margin call', 'bg-amber-100 text-amber-950 ring-amber-200')}
      {chip(defaulted, 'Defaulted', 'bg-orange-100 text-orange-950 ring-orange-200')}
      {chip(liquidated, 'Liquidated', 'bg-rose-100 text-rose-950 ring-rose-200')}
      {trade.bankRepaidSimulator ? (
        <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Bank repaid (sim)
        </span>
      ) : null}
    </div>
  )
}
