'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

import type { FieldDistributionMapProps } from './field-distribution-map.types'

export const FieldDistributionMapDynamic: ComponentType<FieldDistributionMapProps> = dynamic(
  () => import('./field-distribution-map').then((mod) => mod.FieldDistributionMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        Loading map…
      </div>
    ),
  },
)
