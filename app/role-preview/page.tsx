import { notFound } from 'next/navigation'

import { PreviewHomeShell } from '@/components/admin/preview-home-shell'
import { getPreviewProjectRoot } from '@/lib/admin/preview-sessions'
import { ROLE_VALUES } from '@/lib/domain/constants'
import type { Role } from '@/lib/domain/types'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

const isRole = (value: string | undefined): value is Role =>
  !!value && (ROLE_VALUES as readonly string[]).includes(value)

export default async function RolePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ previewId?: string; role?: string; userId?: string }>
}) {
  const sp = await searchParams
  const previewId = sp.previewId?.trim()
  if (!previewId) {
    notFound()
  }

  const root = getPreviewProjectRoot(previewId)
  if (!root) {
    notFound()
  }

  const role = isRole(sp.role) ? sp.role : 'farmer'
  const store = await readLiveDataStore(root)
  const requestedUser = sp.userId?.trim()
  const userId =
    requestedUser && store.users.some((u) => u.id === requestedUser)
      ? requestedUser
      : store.users.find((u) => u.role === role)?.id ?? null

  return <PreviewHomeShell store={store} initialRole={role} initialUserId={userId} />
}
