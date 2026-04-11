import type { BankReview, LiveDataStore, User } from '@/lib/domain/types'

/**
 * Mock login eligibility: active users only; bank onboarding applicants must be approved.
 */
export const isLoginEligibleUser = (user: User, bankReviews: BankReview[]): boolean => {
  if (!user.isActive) {
    return false
  }
  const review = bankReviews.find((r) => r.applicantUserId === user.id)
  if (!review) {
    return true
  }
  return review.reviewStatus === 'APPROVED'
}

export const getEligibleLoginUsers = (store: LiveDataStore): User[] =>
  store.users.filter((u) => isLoginEligibleUser(u, store.bankReviews))
