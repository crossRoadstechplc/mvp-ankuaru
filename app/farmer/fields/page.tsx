import { Suspense } from 'react'

import { FarmerFieldManagement } from '@/components/farmer/farmer-field-management'

export default function FarmerFieldsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 py-16 text-slate-600">
          Loading field management…
        </div>
      }
    >
      <FarmerFieldManagement />
    </Suspense>
  )
}
