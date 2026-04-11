'use client'

import { useRouter } from 'next/navigation'

import { ValidateLotForm } from '@/components/aggregator/validate-lot-form'
import type { Lot } from '@/lib/domain/types'
import { useSessionStore } from '@/store/session-store'

export function ValidateLotFormClient({ lot }: { lot: Lot }) {
  const router = useRouter()
  const userId = useSessionStore((s) => s.currentUserId)
  const role = useSessionStore((s) => s.currentUserRole)

  if (!userId) {
    return <p className="text-sm text-slate-600">Select a user session to record validation.</p>
  }

  if (role !== 'aggregator' && role !== 'admin') {
    return (
      <p className="text-sm text-amber-900">
        Sign in as an <strong>aggregator</strong> or <strong>admin</strong> to validate lots.
      </p>
    )
  }

  return (
    <ValidateLotForm
      lot={lot}
      actorId={userId}
      onSuccess={() => router.push('/aggregator/lot-validation')}
    />
  )
}
