import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BankTradeReviewForm } from '@/components/bank/bank-trade-review-form'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function BankTradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await params
  const store = await initializeLiveDataStore()
  const trade = store.trades.find((t) => t.id === id)
  if (!trade) {
    notFound()
  }

  const bankUsers = store.users.filter((u) => (u.role === 'bank' || u.role === 'admin') && u.isActive)
  const anyLotCollateral = trade.lotIds.some((lotId) => store.lots.find((l) => l.id === lotId)?.isCollateral)

  return (
    <div className="mt-8 space-y-6">
      <Link href="/bank" className="text-sm font-medium text-slate-600 hover:text-slate-950 hover:underline">
        ← Bank dashboard
      </Link>
      <h1 className="text-3xl font-semibold text-slate-950">Trade {trade.id}</h1>
      <p className="text-sm text-slate-600">
        Buyer {trade.buyerUserId} · Seller {trade.sellerUserId} · Status {trade.status}
      </p>
      <div className="max-w-xl">
        <BankTradeReviewForm trade={trade} bankUsers={bankUsers} anyLotCollateral={anyLotCollateral} />
      </div>
    </div>
  )
}
