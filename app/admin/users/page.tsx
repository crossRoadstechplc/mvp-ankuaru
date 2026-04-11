import { EntityAdminScreen } from '@/components/crud/entity-admin-screen'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminUsersPage() {
  const store = await initializeLiveDataStore()

  return <EntityAdminScreen screen="users" items={store.users} />
}
