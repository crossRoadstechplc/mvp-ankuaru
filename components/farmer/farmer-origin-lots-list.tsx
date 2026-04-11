'use client'

import Link from 'next/link'

import type { Field, Lot } from '@/lib/domain/types'

export type FarmerOriginListMode = 'single-farmer' | 'all-farmers-origin'

export type FarmerOriginLotsListProps = {
  lots: Lot[]
  fields: Field[]
  farmerUserId: string
  /** Farmer: one account. Aggregator (and other non-farmers): every lot linked to a farmer for review / aggregation. */
  listMode?: FarmerOriginListMode
}

const fieldName = (fields: Field[], fieldId?: string) =>
  fieldId ? (fields.find((f) => f.id === fieldId)?.name ?? fieldId) : '—'

export function FarmerOriginLotsList({
  lots,
  fields,
  farmerUserId,
  listMode = 'single-farmer',
}: FarmerOriginLotsListProps) {
  const visible =
    listMode === 'all-farmers-origin'
      ? [...lots].filter((lot) => Boolean(lot.farmerId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : lots.filter((lot) => lot.farmerId === farmerUserId)

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        {listMode === 'all-farmers-origin'
          ? 'No farmer-linked origin lots in the store yet. Lots must have a farmer record to appear here.'
          : 'No lots yet for this farmer. Use the form above to create a cherry lot and PICK event.'}
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visible.map((lot) => (
        <article
          key={lot.id}
          className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Lot</p>
          <p className="mt-1 font-mono text-lg font-semibold text-slate-950">{lot.publicLotCode}</p>
          {listMode === 'all-farmers-origin' && lot.farmerId ? (
            <p className="mt-2 text-xs text-slate-500">
              Farmer <span className="font-mono text-slate-800">{lot.farmerId}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm text-slate-600">
            Field: {fieldName(fields, lot.fieldId)} · {lot.form} ·{' '}
            <span className="font-semibold text-slate-900">{lot.weight} kg</span>
            {' · '}
            {lot.status}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">{lot.id}</p>
          <Link
            href={`/lots/${lot.id}`}
            className="mt-4 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Open lot detail
          </Link>
        </article>
      ))}
    </div>
  )
}
