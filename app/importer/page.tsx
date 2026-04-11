import { ImporterLotLookup } from '@/components/importer/importer-lot-lookup'
import { PageIntro } from '@/components/ui/page-intro'
import { getAuthorizedLotIdsForImporter } from '@/lib/permissions/importer-access'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

const DEFAULT_IMPORTER_ID = 'user-importer-001'

export default async function ImporterPortalPage() {
  const store = await initializeLiveDataStore()
  const authorizedLotIds = getAuthorizedLotIdsForImporter(store, DEFAULT_IMPORTER_ID)

  return (
    <div className="space-y-8">
      <PageIntro
        eyebrow="Importer"
        title="Authorized lot trace"
        lead="Search lots linked to your purchase trades. Other inventory stays hidden."
      />
      <ImporterLotLookup buyerUserId={DEFAULT_IMPORTER_ID} authorizedLotIds={authorizedLotIds} />
    </div>
  )
}
