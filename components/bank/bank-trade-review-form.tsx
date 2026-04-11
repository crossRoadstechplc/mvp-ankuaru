'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import type { Trade, User } from '@/lib/domain/types'
import { TradeFinancingBadges } from '@/components/trade/trade-financing-badges'

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return data
}

export type BankTradeReviewFormProps = {
  trade: Trade
  bankUsers: User[]
  anyLotCollateral: boolean
}

export function BankTradeReviewForm({ trade, bankUsers, anyLotCollateral }: BankTradeReviewFormProps) {
  const [bankUserId, setBankUserId] = useState(bankUsers[0]?.id ?? '')
  const [marginPercent, setMarginPercent] = useState('18')
  const [financingNotes, setFinancingNotes] = useState('')
  const [financedAmount, setFinancedAmount] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (trade.bankApproved) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-slate-700">Financing status</p>
        <TradeFinancingBadges trade={trade} collateralActive={anyLotCollateral} />
        {trade.financingNotes ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-800">Terms / notes</p>
            <p className="mt-2 whitespace-pre-wrap">{trade.financingNotes}</p>
          </div>
        ) : null}
        {trade.simulationSellerPaidByBank ? (
          <p className="text-sm text-slate-600">
            Simulator: seller treated as paid in full by bank; buyer initial cash call limited to margin per policy.
          </p>
        ) : null}
      </div>
    )
  }

  const handleApprove = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const m = Number(marginPercent)
    if (!Number.isFinite(m) || m <= 0 || m > 100) {
      setError('Margin % must be between 0 and 100.')
      return
    }
    const fa = financedAmount.trim() === '' ? undefined : Number(financedAmount)
    if (financedAmount.trim() !== '' && (!Number.isFinite(fa) || (fa !== undefined && fa < 0))) {
      setError('Financed amount must be a non-negative number.')
      return
    }

    setSaving(true)
    try {
      await fetchJson('/api/bank/trade-review', {
        method: 'POST',
        body: JSON.stringify({
          tradeId: trade.id,
          bankUserId,
          decision: 'approve',
          marginPercent: m,
          financingNotes: financingNotes.trim() || undefined,
          financedAmount: fa,
        }),
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  const handleReject = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await fetchJson('/api/bank/trade-review', {
        method: 'POST',
        body: JSON.stringify({
          tradeId: trade.id,
          bankUserId,
          decision: 'reject',
          financingNotes: rejectNotes.trim() || undefined,
        }),
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-slate-700">Current snapshot</p>
        <div className="mt-2">
          <TradeFinancingBadges trade={trade} collateralActive={false} />
        </div>
      </div>

      <form onSubmit={handleApprove} className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h3 className="text-lg font-semibold text-emerald-950">Approve financing (simulator)</h3>
        <p className="text-sm text-emerald-900/90">
          Sets bank approval, locks margin %, marks lots as collateral against this bank user, and records simulator
          flags (seller paid by bank; buyer margin-only upfront).
        </p>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Bank officer</span>
          <select
            value={bankUserId}
            onChange={(e) => setBankUserId(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          >
            {bankUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Margin % (buyer upfront)</span>
          <input
            type="number"
            step="0.1"
            min={0.1}
            max={100}
            value={marginPercent}
            onChange={(e) => setMarginPercent(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Financing notes / terms</span>
          <textarea
            value={financingNotes}
            onChange={(e) => setFinancingNotes(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Covenants, tenor, pricing — simulator only"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-slate-700">Notional financed amount (optional)</span>
          <input
            type="number"
            min={0}
            step="1"
            value={financedAmount}
            onChange={(e) => setFinancedAmount(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="e.g. facility size for narrative"
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="submit"
          disabled={saving || bankUsers.length === 0}
          className="rounded-full bg-emerald-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Approve & lock margin'}
        </button>
      </form>

      <form onSubmit={handleReject} className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
        <h3 className="text-lg font-semibold text-rose-950">Reject financing</h3>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Notes to record</span>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full border border-rose-700 bg-white px-5 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
        >
          Reject financing
        </button>
      </form>
    </div>
  )
}
