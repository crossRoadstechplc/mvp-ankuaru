import type { BankReview } from '@/lib/domain/types'

export const isBankApprovedUser = (userId: string, bankReviews: BankReview[]): boolean =>
  bankReviews.some((review) => review.applicantUserId === userId && review.reviewStatus === 'APPROVED')
