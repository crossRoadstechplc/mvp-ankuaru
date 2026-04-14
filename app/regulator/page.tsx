import Link from 'next/link'

import { RegulatorOversightPanel } from '@/components/regulator/regulator-oversight-panel'
import { btnCtaOpenCompactClass } from '@/components/ui/button-styles'
import { PageIntro } from '@/components/ui/page-intro'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'
import { redactTradeForRole } from '@/lib/trade-discovery/commercial-visibility'

export default async function RegulatorOversightPage() {
  const store = await initializeLiveDataStore()
  const trades = store.trades.map((t) => redactTradeForRole(t, 'regulator', 'trade_discovery'))

  return (
    <div className="space-y-10">
      <PageIntro
        eyebrow="Reviewer"
        title="Reports and traceability oversight"
        lead="Read-only reporting workspace: transaction summaries, lineage navigation, and trace evidence review."
      />

      <RegulatorOversightPanel trades={trades} />

      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Sample lots</h2>
        <p className="mt-2 text-sm text-slate-600">Jump into lot detail and lineage for a quick trace review.</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {store.lots.slice(0, 6).map((lot) => (
            <li key={lot.id}>
              <Link href={`/lots/${lot.id}`} className={btnCtaOpenCompactClass}>
                {lot.publicLotCode}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
