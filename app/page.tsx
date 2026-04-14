import { HomeDashboard } from '@/components/home-dashboard'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const store = await initializeLiveDataStore()

  return <HomeDashboard store={store} />
}
