import { CreateRfqForm } from '@/components/trade/create-rfq-form'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function NewRfqPage() {
  const store = await initializeLiveDataStore()
  const publisherUsers = store.users.filter((u) => u.isActive && (u.role === 'exporter' || u.role === 'importer'))

  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold text-slate-950">Create RFQ</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-600">
        Describe what you need. Exporter or importer accounts publish here; counterparties respond with bids. Compare
        pricing and referenced lots on the RFQ detail page or in Discovery.
      </p>
      <div className="mt-8 max-w-lg">
        <CreateRfqForm publisherUsers={publisherUsers} />
      </div>
    </div>
  )
}
