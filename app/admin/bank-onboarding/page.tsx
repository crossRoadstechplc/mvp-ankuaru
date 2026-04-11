import { OnboardingReviewList } from '@/components/bank/onboarding-review-list'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminBankOnboardingPage() {
  const store = await initializeLiveDataStore()
  const usersById = new Map(store.users.map((u) => [u.id, u]))
  const open = store.bankReviews.filter((r) => r.reviewStatus !== 'APPROVED' && r.reviewStatus !== 'REJECTED')

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-2xl font-semibold text-slate-950">Bank onboarding oversight</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Same onboarding queue as the bank workspace: monitor applicant reviews, statuses, and activation (simulator).
          Use detail pages to record decisions with a bank or admin actor.
        </p>
      </header>

      <section>
        <h3 className="text-lg font-semibold text-slate-950">Open queue</h3>
        <p className="mt-2 text-sm text-slate-600">
          {open.length} pending or in-progress {open.length === 1 ? 'review' : 'reviews'}
        </p>
        <OnboardingReviewList reviews={open} usersById={usersById} detailPathPrefix="/admin/bank-onboarding" />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-950">All reviews</h3>
        <OnboardingReviewList reviews={store.bankReviews} usersById={usersById} detailPathPrefix="/admin/bank-onboarding" />
      </section>
    </div>
  )
}
