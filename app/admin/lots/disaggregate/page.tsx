'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { DisaggregateLotForm } from '@/components/lots/disaggregate-lot-form'

export default function AdminDisaggregateLotPage() {
  const router = useRouter()

  return (
    <div className="mx-auto min-h-screen w-full max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href="/admin/lots"
        className="text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-950 hover:underline"
      >
        ← Back to lots admin
      </Link>
      <h1 className="mt-6 text-3xl font-semibold text-slate-950">Disaggregate lot</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Split one source lot into multiple child lots. A{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">DISAGGREGATE</code> event records the split; child
        weights must not exceed the source weight.
      </p>
      <div className="mt-8">
        <DisaggregateLotForm
          onSuccess={({ childLotIds }) => {
            const first = childLotIds[0]
            if (first) {
              router.push(`/lots/${first}`)
            }
          }}
        />
      </div>
    </div>
  )
}
