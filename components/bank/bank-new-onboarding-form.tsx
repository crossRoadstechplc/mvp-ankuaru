'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { btnCtaVioletClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
import type { Role } from '@/lib/domain/types'

const TRADE_ROLES: Role[] = ['exporter', 'importer', 'processor']

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

export type BankNewOnboardingFormProps = {
  defaultReviewerBankUserId: string
}

/** Register a new inactive trading user and open a bank onboarding review (simulator). */
export function BankNewOnboardingForm({ defaultReviewerBankUserId }: BankNewOnboardingFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('exporter')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const created = (await fetchJson('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          role,
          isActive: false,
        }),
      })) as { id: string }

      await fetchJson('/api/bankReviews', {
        method: 'POST',
        body: JSON.stringify({
          applicantUserId: created.id,
          reviewerBankUserId: defaultReviewerBankUserId,
          reviewStatus: 'PENDING_REVIEW',
          notes: notes.trim() || 'New client onboarding application',
        }),
      })

      showAppToast('Onboarding case created. The client stays inactive until you approve.')
      setName('')
      setEmail('')
      setNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-violet-200/90 bg-gradient-to-b from-violet-50/80 to-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-950">Register new trading client</h2>
        <p className="mt-2 text-sm text-slate-600">
          Creates an inactive account and opens a review. After approval, the client can sign in. Assign one of the
          trading roles allowed in this build: exporter, importer, or processor.
        </p>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Legal / display name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="e.g. Acme Exports Ltd"
          autoComplete="organization"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Contact email (optional)</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="ops@example.com"
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Trading role (initial)</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 capitalize"
        >
          {TRADE_ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Internal notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Source of referral, KYC batch id…"
        />
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={saving || !defaultReviewerBankUserId} className={btnCtaVioletClass}>
        {saving ? 'Creating…' : 'Create onboarding case'}
      </button>
      {!defaultReviewerBankUserId ? (
        <p className="text-sm text-amber-800">No active bank officer user found in seed data.</p>
      ) : null}
    </form>
  )
}
