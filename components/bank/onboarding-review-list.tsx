import Link from 'next/link'

import type { BankReview, User } from '@/lib/domain/types'

const statusLabel = (s: BankReview['reviewStatus']) => s.replace(/_/g, ' ')

export type OnboardingReviewListProps = {
  reviews: BankReview[]
  usersById: Map<string, User>
  detailPathPrefix: string
}

export function OnboardingReviewList({ reviews, usersById, detailPathPrefix }: OnboardingReviewListProps) {
  if (reviews.length === 0) {
    return <p className="text-sm text-slate-600">No onboarding reviews in the store.</p>
  }

  return (
    <ul className="mt-4 space-y-3">
      {reviews.map((review) => {
        const applicant = usersById.get(review.applicantUserId)
        return (
          <li key={review.id}>
            <Link
              href={`${detailPathPrefix}/${review.id}`}
              className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-300 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-xs text-slate-500">{review.id}</p>
                <p className="mt-1 font-medium text-slate-950">{applicant?.name ?? review.applicantUserId}</p>
                <p className="text-sm text-slate-600">
                  {applicant?.role} · {applicant?.isActive ? 'active' : 'inactive'}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-950">
                {statusLabel(review.reviewStatus)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
