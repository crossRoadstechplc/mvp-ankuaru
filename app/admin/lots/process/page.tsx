'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { ProcessLotsForm } from '@/components/lots/process-lots-form'

export default function AdminProcessLotsPage() {
  const router = useRouter()

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/admin/lots"
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline"
      >
        ← Back to lots admin
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-950">Record processing</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Mass must balance: input weight equals the main output plus pulp, husk, parchment, defects, and moisture loss.
        Non-zero byproducts become separate BYPRODUCT lots with a classified inventory kind.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/admin/inventory/byproducts" className="font-medium text-violet-800 underline-offset-2 hover:underline">
          View byproduct inventory summary
        </Link>
      </p>
      <div className="mt-8">
        <ProcessLotsForm
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
