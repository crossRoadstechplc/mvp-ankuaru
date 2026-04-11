'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  buyerUserId: string
  authorizedLotIds: string[]
}

/**
 * Client lookup: validates lot id against authorized buyer-linked lots before navigation.
 */
export function ImporterLotLookup({ buyerUserId, authorizedLotIds }: Props) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const id = value.trim()
    setError(null)
    if (!id) {
      setError('Enter a lot id')
      return
    }
    if (!authorizedLotIds.includes(id)) {
      setError('This lot is not authorized for your buyer account.')
      return
    }
    router.push(`/importer/lots/${encodeURIComponent(id)}?buyerUserId=${encodeURIComponent(buyerUserId)}`)
  }

  return (
    <section
      className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5"
      data-testid="importer-lot-lookup"
    >
      <h2 className="text-lg font-semibold text-slate-950">Look up authorized lot</h2>
      <p className="mt-2 text-sm text-slate-600">Enter the internal lot id (e.g. from your purchase paperwork).</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="font-medium text-slate-700">Lot id</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2 font-mono text-sm"
            placeholder="lot-green-001"
          />
        </label>
        <button
          type="button"
          onClick={() => submit()}
          className="rounded-full bg-slate-950 px-6 py-2 text-sm font-medium text-white"
        >
          Open trace
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      {authorizedLotIds.length > 0 ? (
        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Authorized on your trades</p>
          <ul className="mt-3 flex flex-wrap gap-2" data-testid="importer-authorized-lot-chips">
            {authorizedLotIds.map((id) => (
              <li key={id}>
                <Link
                  href={`/importer/lots/${encodeURIComponent(id)}?buyerUserId=${encodeURIComponent(buyerUserId)}`}
                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium text-slate-800 hover:border-slate-300"
                >
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
