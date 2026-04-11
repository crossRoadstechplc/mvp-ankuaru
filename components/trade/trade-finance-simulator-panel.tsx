'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import type { Trade } from '@/lib/domain/types'
import { marginMaintenanceFloorFromPercent } from '@/lib/trade-lifecycle/margin-floor'

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
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

export type TradeFinanceSimulatorPanelProps = {
  trade: Trade
  buyerLabel: string
  sellerLabel: string
  bankOptions: { id: string; label: string }[]
}

export function TradeFinanceSimulatorPanel({
  trade,
  buyerLabel,
  sellerLabel,
  bankOptions,
}: TradeFinanceSimulatorPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const floor = marginMaintenanceFloorFromPercent(trade.marginPercent)

  const post = async (url: string, body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fetchJson(url, { method: 'POST', body: JSON.stringify(body) })
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  const onSettlement = async (event: FormEvent) => {
    event.preventDefault()
    const fd = new FormData(event.target as HTMLFormElement)
    const actorUserId = String(fd.get('actorUserId') ?? '')
    const repayBank = fd.get('repayBank') === 'on'
    const completeSettlement = fd.get('completeSettlement') === 'on'
    await post('/api/trade/settlement-sim', {
      tradeId: trade.id,
      actorUserId,
      repayBank,
      completeSettlement,
    })
  }

  const onMargin = async (event: FormEvent) => {
    event.preventDefault()
    const fd = new FormData(event.target as HTMLFormElement)
    const actorUserId = String(fd.get('actorUserId') ?? '')
    const simulatedPriceIndex = Number(fd.get('simulatedPriceIndex'))
    await post('/api/trade/margin-evaluate', {
      tradeId: trade.id,
      actorUserId,
      simulatedPriceIndex,
    })
  }

  const onDefault = async (event: FormEvent) => {
    event.preventDefault()
    const fd = new FormData(event.target as HTMLFormElement)
    const bankUserId = String(fd.get('bankUserId') ?? '')
    await post('/api/trade/default-sim', { tradeId: trade.id, bankUserId })
  }

  const onLiquidate = async (event: FormEvent) => {
    event.preventDefault()
    const fd = new FormData(event.target as HTMLFormElement)
    const bankUserId = String(fd.get('bankUserId') ?? '')
    await post('/api/trade/liquidate-sim', { tradeId: trade.id, bankUserId })
  }

  const settlementActors = [
    { id: trade.buyerUserId, label: `${buyerLabel} (buyer)` },
    { id: 'user-admin-001', label: 'Platform Admin' },
  ]

  const marginActors = [
    { id: 'user-bank-001', label: 'Bank' },
    { id: 'user-admin-001', label: 'Admin' },
    { id: trade.buyerUserId, label: `${buyerLabel} (buyer)` },
    { id: trade.sellerUserId, label: `${sellerLabel} (seller)` },
  ]

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {trade.status === 'DELIVERED' ? (
        <form onSubmit={onSettlement} className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
          <h3 className="font-semibold text-emerald-950">Settlement (buyer)</h3>
          <p className="text-sm text-emerald-900/90">Repay bank and/or mark settlement complete (simulator).</p>
          <label className="block text-sm">
            Actor
            <select name="actorUserId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required>
              {settlementActors.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="repayBank" defaultChecked />
            Repay bank (simulator)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="completeSettlement" defaultChecked />
            Complete settlement (status → SETTLED)
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Submit settlement
          </button>
        </form>
      ) : null}

      {trade.bankApproved &&
      ['BANK_APPROVED', 'IN_TRANSIT', 'DELIVERED', 'MARGIN_CALL'].includes(trade.status) ? (
        <form onSubmit={onMargin} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h3 className="font-semibold text-amber-950">Margin monitoring</h3>
          <p className="text-sm text-amber-900/90">
            Simulated price index (1.0 = par). Maintenance floor for this trade: <strong>{floor.toFixed(4)}</strong> — if
            index falls below, status becomes MARGIN_CALL.
          </p>
          <label className="block text-sm">
            Actor
            <select name="actorUserId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required>
              {marginActors.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Simulated price index
            <input
              name="simulatedPriceIndex"
              type="number"
              step={0.01}
              min={0.01}
              max={5}
              defaultValue={trade.simulatedPriceIndex ?? 1}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Run margin evaluation
          </button>
        </form>
      ) : null}

      {trade.status === 'MARGIN_CALL' ? (
        <form onSubmit={onDefault} className="space-y-3 rounded-2xl border border-orange-200 bg-orange-50/40 p-5">
          <h3 className="font-semibold text-orange-950">Declare default (bank)</h3>
          <p className="text-sm text-orange-900/90">Margin remains unmet — escalate to DEFAULTED (simulator).</p>
          <label className="block text-sm">
            Bank officer
            <select name="bankUserId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required>
              {bankOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || bankOptions.length === 0}
            className="rounded-full bg-orange-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Declare default
          </button>
        </form>
      ) : null}

      {trade.status === 'MARGIN_CALL' || trade.status === 'DEFAULTED' ? (
        <form onSubmit={onLiquidate} className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
          <h3 className="font-semibold text-rose-950">Liquidate collateral (bank)</h3>
          <p className="text-sm text-rose-900/90">
            Bank seizes liquidates pledged lots: clears collateral flags on linked lots (simulator).
          </p>
          <label className="block text-sm">
            Bank officer
            <select name="bankUserId" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" required>
              {bankOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || bankOptions.length === 0}
            className="rounded-full bg-rose-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Liquidate collateral
          </button>
        </form>
      ) : null}
    </div>
  )
}
