import type { Trade } from '@/lib/domain/types'

type Props = {
  trade: Pick<
    Trade,
    'status' | 'deliveredWeightKg' | 'deliveredQualityOk' | 'deliveryConfirmedAt' | 'adjustmentAmount'
  >
  /** When false, hide weight, adjustment, and quality detail (e.g. redacted public view). */
  showCommercialDetail?: boolean
}

export function DeliveryStatusBadges({ trade, showCommercialDetail = true }: Props) {
  const delivered = trade.status === 'DELIVERED' || trade.status === 'SETTLED'

  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${
          delivered
            ? 'bg-teal-100 text-teal-950 ring-teal-200'
            : 'bg-slate-100 text-slate-600 ring-slate-200'
        }`}
      >
        {delivered ? 'Delivered' : 'Delivery pending'}
      </span>
      {showCommercialDetail && delivered ? (
        <>
          {trade.deliveredWeightKg != null ? (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
              Weight {trade.deliveredWeightKg} kg
            </span>
          ) : null}
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
              trade.deliveredQualityOk
                ? 'bg-emerald-100 text-emerald-950 ring-emerald-200'
                : 'bg-amber-100 text-amber-950 ring-amber-200'
            }`}
          >
            Quality {trade.deliveredQualityOk ? 'accepted' : 'not accepted'}
          </span>
          {trade.adjustmentAmount != null && trade.adjustmentAmount !== 0 ? (
            <span className="inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-950 ring-1 ring-violet-200">
              Adjustment {trade.adjustmentAmount > 0 ? '+' : ''}
              {trade.adjustmentAmount}
            </span>
          ) : null}
        </>
      ) : null}
      {trade.deliveryConfirmedAt && showCommercialDetail ? (
        <span className="text-xs text-slate-500">Confirmed {trade.deliveryConfirmedAt}</span>
      ) : null}
    </div>
  )
}
