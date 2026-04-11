import { DiscoveryWorkspace } from '@/components/discovery/discovery-workspace'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function DiscoveryPage() {
  const store = await initializeLiveDataStore()
  return <DiscoveryWorkspace store={store} />
}
