import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OnboardingReviewActions } from '@/components/bank/onboarding-review-actions'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminBankOnboardingDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const { id } = await params
  const store = await initializeLiveDataStore()
  const review = store.bankReviews.find((r) => r.id === id)
  if (!review) {
    notFound()
  }

  const applicant = store.users.find((u) => u.id === review.applicantUserId)
  const bankUsers = store.users.filter((u) => u.isActive && (u.role === 'bank' || u.role === 'admin'))

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/bank-onboarding" className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline">
          ← Onboarding list
        </Link>
        <h2 className="mt-4 text-2xl font-semibold text-slate-950">Review {review.id}</h2>
        <p className="mt-2 font-mono text-xs text-slate-500">Applicant user id: {review.applicantUserId}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
        <h3 className="text-lg font-semibold text-slate-950">Applicant</h3>
        {applicant ? (
          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500">Name</dt>
              <dd className="mt-1">{applicant.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Role</dt>
              <dd className="mt-1 capitalize">{applicant.role}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Account active</dt>
              <dd className="mt-1">{applicant.isActive ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-amber-800">Applicant record missing.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-slate-950">Review record</h3>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Status</dt>
            <dd className="mt-1">{review.reviewStatus.replace(/_/g, ' ')}</dd>
          </div>
          {review.notes ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">{review.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-950">Actions</h3>
        <OnboardingReviewActions
          reviewId={review.id}
          reviewStatus={review.reviewStatus}
          bankUsers={bankUsers}
          initialFinancialAssessment={review.financialAssessment ?? ''}
          initialBackgroundCheckStatus={review.backgroundCheckStatus ?? ''}
          initialNotes={review.notes ?? ''}
        />
      </section>
    </div>
  )
}
