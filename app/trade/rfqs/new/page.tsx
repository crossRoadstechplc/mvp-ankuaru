import { CreateRfqForm } from '@/components/trade/create-rfq-form'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export const dynamic = 'force-dynamic'

export default async function NewRfqPage() {
  const store = await initializeLiveDataStore()
  const publisherUsers = store.users.filter(
    (u) => u.isActive && (u.role === 'processor' || u.role === 'exporter' || u.role === 'importer'),
  )
  const lots = store.lots
  const labResults = store.labResults
  const processedOutputLotIds = Array.from(
    new Set(
      store.events
        .filter((event) => event.type === 'PROCESS')
        .flatMap((event) => event.outputLotIds),
    ),
  )

  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold text-slate-950">Create RFQ</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600">
        Describe what you need. Processor, exporter, or importer accounts can publish here; counterparties respond with bids. Compare
        pricing and referenced lots on the RFQ detail page or in Discovery.
      </p>
      <div className="mt-8 max-w-lg">
        <CreateRfqForm
          publisherUsers={publisherUsers}
          lots={lots}
          labResults={labResults}
          processedOutputLotIds={processedOutputLotIds}
        />
      </div>
    </div>
  )
}
