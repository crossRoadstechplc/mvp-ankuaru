import Link from 'next/link'

import { OnboardingReviewList } from '@/components/bank/onboarding-review-list'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function BankOnboardingPage() {
  const store = await initializeLiveDataStore()
  const usersById = new Map(store.users.map((u) => [u.id, u]))
  const open = store.bankReviews.filter((r) => r.reviewStatus !== 'APPROVED' && r.reviewStatus !== 'REJECTED')

  return (
    <div className="mt-8 space-y-10">
      <header>
        <h1 className="text-3xl font-semibold text-slate-950">User onboarding</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Simulator: bank-led financial and background review before an applicant account is activated. Approvals set the
          user to active; rejection or pre-approval states keep them inactive until cleared.
        </p>
        <p className="mt-4">
          <Link href="/bank" className="text-sm font-medium text-violet-800 underline-offset-2 hover:underline">
            ← Trade financing desk
          </Link>
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Open queue</h2>
        <p className="mt-2 text-sm text-slate-600">
          {open.length} pending or in-progress {open.length === 1 ? 'review' : 'reviews'}
        </p>
        <OnboardingReviewList reviews={open} usersById={usersById} detailPathPrefix="/bank/onboarding" />
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-950">All reviews</h2>
        <OnboardingReviewList reviews={store.bankReviews} usersById={usersById} detailPathPrefix="/bank/onboarding" />
      </section>
    </div>
  )
}
