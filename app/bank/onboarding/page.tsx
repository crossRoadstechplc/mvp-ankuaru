import Link from 'next/link'

import { OnboardingReviewList } from '@/components/bank/onboarding-review-list'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function BankOnboardingPage() {
  const store = await initializeLiveDataStore()
  const usersById = new Map(store.users.map((u) => [u.id, u]))
  const open = store.bankReviews.filter((r) => r.reviewStatus !== 'APPROVED' && r.reviewStatus !== 'REJECTED')
  const approvedReviews = store.bankReviews.filter((r) => r.reviewStatus === 'APPROVED')
  const approvedTraderRoles = new Set(['processor', 'exporter', 'importer', 'aggregator', 'transporter', 'lab'])
  const approvedTraders = approvedReviews
    .map((review) => {
      const user = usersById.get(review.applicantUserId)
      if (!user || !approvedTraderRoles.has(user.role)) return null
      return {
        review,
        user,
        rfqCount: store.rfqs.filter((rfq) => rfq.createdByUserId === user.id).length,
        bidCount: store.bids.filter((bid) => bid.bidderUserId === user.id).length,
        tradeCount: store.trades.filter((trade) => trade.buyerUserId === user.id || trade.sellerUserId === user.id).length,
        ownedLotCount: store.lots.filter((lot) => lot.ownerId === user.id).length,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)

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

      <section>
        <h2 className="text-xl font-semibold text-slate-950">Approved traders registry</h2>
        <p className="mt-2 text-sm text-slate-600">
          Bank-approved marketplace actors eligible for RFQ posting and trade interactions.
        </p>
        {approvedTraders.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No approved traders yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {approvedTraders.map(({ review, user, rfqCount, bidCount, tradeCount, ownedLotCount }) => (
              <li key={review.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-950">
                    {user.name} <span className="text-sm font-normal text-slate-600">({user.role})</span>
                  </p>
                  <Link
                    href={`/bank/onboarding/${review.id}`}
                    className="text-sm font-medium text-emerald-900 underline-offset-2 hover:underline"
                  >
                    Full profile
                  </Link>
                </div>
                <p className="mt-1 text-xs text-slate-600">{user.id}</p>
                <p className="mt-2 text-sm text-slate-700">
                  RFQs: {rfqCount} · Bids: {bidCount} · Trades: {tradeCount} · Owned lots: {ownedLotCount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
