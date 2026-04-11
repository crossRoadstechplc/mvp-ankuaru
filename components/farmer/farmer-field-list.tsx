'use client'

import { useState } from 'react'

import type { Field } from '@/lib/domain/types'

export type FarmerFieldListProps = {
  fields: Field[]
  farmerDisplayName?: string
  onEdit: (field: Field) => void
  onDelete: (field: Field) => void
}

export function FarmerFieldList({ fields, farmerDisplayName, onEdit, onDelete }: FarmerFieldListProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (fields.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
        No fields yet for this farmer. Draw a polygon on the map and save to create one.
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {fields.map((field) => {
        const isOpen = expanded[field.id] ?? false
        return (
          <article
            key={field.id}
            className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Field</p>
                <p className="mt-1 text-lg font-semibold text-slate-950">{field.name}</p>
                {farmerDisplayName ? (
                  <p className="mt-1 text-sm text-slate-600">Farmer: {farmerDisplayName}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700"
                onClick={() => setExpanded((prev) => ({ ...prev, [field.id]: !isOpen }))}
              >
                {isOpen ? 'Hide detail' : 'Show detail'}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Vertices</p>
                <p className="mt-1 font-semibold text-slate-900">{field.polygon.length}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Area (sq m)</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {field.areaSqm != null ? field.areaSqm.toLocaleString() : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Centroid</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {field.centroid
                    ? `${field.centroid.lat.toFixed(5)}, ${field.centroid.lng.toFixed(5)}`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                aria-label={`Edit field ${field.id}`}
                onClick={() => onEdit(field)}
              >
                Edit
              </button>
              <button
                type="button"
                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
                aria-label={`Delete field ${field.id}`}
                onClick={() => onDelete(field)}
              >
                Delete
              </button>
            </div>

            {isOpen ? (
              <div className="mt-5 border-t border-slate-200 pt-5 text-sm text-slate-700">
                <p className="font-medium text-slate-500">Polygon coordinates</p>
                <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-50 p-3 text-xs leading-5">
                  {JSON.stringify(field.polygon, null, 2)}
                </pre>
                <p className="mt-3 text-xs text-slate-500">Field id: {field.id}</p>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
