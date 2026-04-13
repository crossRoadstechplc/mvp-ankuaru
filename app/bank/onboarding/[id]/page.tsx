import Link from 'next/link'
import { notFound } from 'next/navigation'

import { OnboardingReviewActions } from '@/components/bank/onboarding-review-actions'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function BankOnboardingDetailPage({
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
  const applicantLots = applicant ? store.lots.filter((lot) => lot.ownerId === applicant.id).slice(0, 6) : []
  const applicantRfqs = applicant ? store.rfqs.filter((rfq) => rfq.createdByUserId === applicant.id).slice(0, 6) : []
  const applicantBids = applicant ? store.bids.filter((bid) => bid.bidderUserId === applicant.id).slice(0, 6) : []
  const applicantTrades = applicant
    ? store.trades.filter((trade) => trade.buyerUserId === applicant.id || trade.sellerUserId === applicant.id).slice(0, 6)
    : []

  return (
    <div className="mt-8 space-y-8">
      <div>
        <Link href="/bank/onboarding" className="text-sm font-medium text-violet-800 underline-offset-2 hover:underline">
          ← Onboarding list
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-950">Review {review.id}</h1>
        <p className="mt-2 font-mono text-xs text-slate-500">Applicant user id: {review.applicantUserId}</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
        <h2 className="text-lg font-semibold text-slate-950">Applicant</h2>
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
              <dt className="font-medium text-slate-500">Email</dt>
              <dd className="mt-1">{applicant.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Account active</dt>
              <dd className="mt-1">{applicant.isActive ? 'Yes' : 'No (blocked until approved)'}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-amber-800">Applicant record missing from users collection.</p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Applicant 360 profile</h2>
        <p className="mt-2 text-sm text-slate-600">
          Full contextual data for approval decision (activity, trade participation, and lot ownership).
        </p>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Owned lots</dt>
            <dd className="mt-1">{applicantLots.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Published opportunities</dt>
            <dd className="mt-1">{applicantRfqs.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Submitted bids</dt>
            <dd className="mt-1">{applicantBids.length}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Trades involved</dt>
            <dd className="mt-1">{applicantTrades.length}</dd>
          </div>
        </dl>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">Recent owned lots</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {applicantLots.length === 0 ? <li>No lots owned.</li> : applicantLots.map((lot) => <li key={lot.id}>{lot.publicLotCode} · {lot.status}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900">Recent opportunities</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-700">
              {applicantRfqs.length === 0 ? <li>No opportunities published.</li> : applicantRfqs.map((rfq) => <li key={rfq.id}>{rfq.id} · {rfq.opportunityType ?? 'RFQ'} · {rfq.status}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-950">Current review record</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-500">Status</dt>
            <dd className="mt-1">{review.reviewStatus.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Reviewer</dt>
            <dd className="mt-1 font-mono text-xs">{review.reviewerBankUserId}</dd>
          </div>
          {review.financialAssessment ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-500">Financial assessment</dt>
              <dd className="mt-1 whitespace-pre-wrap">{review.financialAssessment}</dd>
            </div>
          ) : null}
          {review.backgroundCheckStatus ? (
            <div>
              <dt className="font-medium text-slate-500">Background check</dt>
              <dd className="mt-1">{review.backgroundCheckStatus}</dd>
            </div>
          ) : null}
          {review.notes ? (
            <div className="sm:col-span-2">
              <dt className="font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 whitespace-pre-wrap">{review.notes}</dd>
            </div>
          ) : null}
          {review.approvedAt ? (
            <div>
              <dt className="font-medium text-slate-500">Approved at</dt>
              <dd className="mt-1">{review.approvedAt}</dd>
            </div>
          ) : null}
          {review.rejectedAt ? (
            <div>
              <dt className="font-medium text-slate-500">Rejected at</dt>
              <dd className="mt-1">{review.rejectedAt}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-950">Actions</h2>
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
