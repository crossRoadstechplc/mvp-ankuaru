import { Suspense } from 'react'

import { FarmerLotsClient } from '@/components/farmer/farmer-lots-client'

export default function FarmerLotsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-16 text-slate-600">
          Loading lots…
        </div>
      }
    >
      <FarmerLotsClient />
    </Suspense>
  )
}
