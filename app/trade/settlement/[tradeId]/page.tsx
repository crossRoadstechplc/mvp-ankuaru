import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TradeFinanceSimulatorPanel } from '@/components/trade/trade-finance-simulator-panel'
import { TradeLifecycleBadges } from '@/components/trade/trade-lifecycle-badges'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function TradeSettlementPage({
  params,
}: {
  params: Promise<{ tradeId: string }> | { tradeId: string }
}) {
  const { tradeId } = await params
  const store = await initializeLiveDataStore()
  const trade = store.trades.find((t) => t.id === tradeId)
  if (!trade) {
    notFound()
  }

  const buyer = store.users.find((u) => u.id === trade.buyerUserId)
  const seller = store.users.find((u) => u.id === trade.sellerUserId)
  const bankOptions = store.users
    .filter((u) => u.isActive && (u.role === 'bank' || u.role === 'admin'))
    .map((u) => ({ id: u.id, label: `${u.name} (${u.role})` }))

  return (
    <div className="mt-8 space-y-8">
      <div>
        <Link href="/trade" className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline">
          ← Trade hub
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Settlement & risk — {trade.id}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Buyer settlement, margin monitoring, default, and collateral liquidation (all simulator).
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Trade state</h2>
        <p className="mt-2 text-sm text-slate-700">
          Record status: <span className="font-mono">{trade.status}</span>
        </p>
        <div className="mt-4">
          <TradeLifecycleBadges trade={trade} />
        </div>
      </section>

      <TradeFinanceSimulatorPanel
        trade={trade}
        buyerLabel={buyer?.name ?? trade.buyerUserId}
        sellerLabel={seller?.name ?? trade.sellerUserId}
        bankOptions={bankOptions}
      />
    </div>
  )
}
