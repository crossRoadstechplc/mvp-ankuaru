'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ProcessLotsForm } from '@/components/lots/process-lots-form'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

export default function ProcessorRecordPage() {
  const router = useRouter()
  const userId = useSessionStore((s) => s.currentUserId)
  const sessionRole = useSessionStore((s) => s.currentUserRole)
  const selectedRole = useUiStore((s) => s.selectedRole)
  const selectedUserId = useUiStore((s) => s.selectedUserId)

  const isProcessorSession = sessionRole === 'processor'
  const isAdminPreviewProcessor = sessionRole === 'admin' && selectedRole === 'processor' && selectedUserId
  const lockedId = isProcessorSession ? userId : isAdminPreviewProcessor ? selectedUserId : null

  if (!userId || !lockedId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-sm text-slate-600">
        <p>
          Sign in as a <strong>processor</strong>, or as <strong>admin</strong> with the role switcher set to processor.
        </p>
        <Link href="/login" className="mt-4 inline-block font-medium text-amber-900 underline">
          Go to login
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link href="/processor" className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline">
        ← Processor
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-950">Record processing</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Input weight must equal main output plus pulp, husk, parchment, defects, and moisture loss.
      </p>
      <div className="mt-8">
        <ProcessLotsForm
          lockedActorId={lockedId}
          restrictToProcessReady
          onSuccess={({ primaryLotId }) => {
            if (primaryLotId) {
              router.push(`/lots/${primaryLotId}`)
            }
          }}
        />
      </div>
    </div>
  )
}
