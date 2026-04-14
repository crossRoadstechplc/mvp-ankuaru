'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

import type { FarmerOriginLotsMapProps } from './farmer-origin-lots-map'

export const FarmerOriginLotsMapDynamic: ComponentType<FarmerOriginLotsMapProps> = dynamic(
  () => import('./farmer-origin-lots-map').then((mod) => mod.FarmerOriginLotsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        Loading map…
      </div>
    ),
  },
)
