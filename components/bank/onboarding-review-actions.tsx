'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'

import type { BankReviewStatus, User } from '@/lib/domain/types'
import { BANK_REVIEW_STATUS_VALUES } from '@/lib/domain/constants'

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

export type OnboardingReviewActionsProps = {
  reviewId: string
  reviewStatus: BankReviewStatus
  bankUsers: User[]
  initialFinancialAssessment?: string
  initialBackgroundCheckStatus?: string
  initialNotes?: string
}

export function OnboardingReviewActions({
  reviewId,
  reviewStatus,
  bankUsers,
  initialFinancialAssessment = '',
  initialBackgroundCheckStatus = '',
  initialNotes = '',
}: OnboardingReviewActionsProps) {
  const [bankUserId, setBankUserId] = useState(bankUsers[0]?.id ?? '')
  const [status, setStatus] = useState<BankReviewStatus>(reviewStatus)
  const [financialAssessment, setFinancialAssessment] = useState(initialFinancialAssessment)
  const [backgroundCheckStatus, setBackgroundCheckStatus] = useState(initialBackgroundCheckStatus)
  const [notes, setNotes] = useState(initialNotes)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const postReview = async (body: Record<string, unknown>) => {
    setSaving(true)
    setError(null)
    try {
      await fetchJson('/api/bank/onboarding-review', {
        method: 'POST',
        body: JSON.stringify({
          reviewId,
          bankUserId,
          ...body,
        }),
      })
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveStatus = async (event: FormEvent) => {
    event.preventDefault()
    await postReview({
      reviewStatus: status,
      financialAssessment: financialAssessment.trim() || undefined,
      backgroundCheckStatus: backgroundCheckStatus.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  const handleApprove = async (event: FormEvent) => {
    event.preventDefault()
    await postReview({
      decision: 'approve',
      financialAssessment: financialAssessment.trim() || undefined,
      backgroundCheckStatus: backgroundCheckStatus.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  const handleReject = async (event: FormEvent) => {
    event.preventDefault()
    await postReview({
      decision: 'reject',
      notes: notes.trim() || undefined,
    })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveStatus} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-slate-950">Update review</h3>
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
          <span className="font-medium text-slate-700">Review status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as BankReviewStatus)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          >
            {BANK_REVIEW_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Financial assessment (simulator)</span>
          <textarea
            value={financialAssessment}
            onChange={(e) => setFinancialAssessment(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="Liquidity, exposure, facility size…"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Background check status</span>
          <input
            value={backgroundCheckStatus}
            onChange={(e) => setBackgroundCheckStatus(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
            placeholder="e.g. Cleared, In progress"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={saving || bankUsers.length === 0}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save status & fields'}
        </button>
      </form>

      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleApprove}>
          <button
            type="submit"
            disabled={saving || bankUsers.length === 0}
            className="rounded-full bg-emerald-800 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Approve onboarding
          </button>
        </form>
        <form onSubmit={handleReject}>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full border border-rose-700 bg-white px-5 py-2 text-sm font-semibold text-rose-900 disabled:opacity-50"
          >
            Reject onboarding
          </button>
        </form>
      </div>
    </div>
  )
}
