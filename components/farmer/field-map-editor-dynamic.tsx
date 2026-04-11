'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

import type { FieldMapEditorProps } from './field-map-editor'

export const FieldMapEditorDynamic: ComponentType<FieldMapEditorProps> = dynamic(
  () => import('./field-map-editor').then((mod) => mod.FieldMapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
        Loading map…
      </div>
    ),
  },
)
