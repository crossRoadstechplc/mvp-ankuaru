import type { BankReview, User } from '@/lib/domain/types'
import { MasterDataError } from '@/lib/master-data/crud'

export const isBankApprovedUser = (userId: string, bankReviews: BankReview[]): boolean =>
  bankReviews.some((review) => review.applicantUserId === userId && review.reviewStatus === 'APPROVED')

export const assertUsersBankApproved = (
  users: User[],
  bankReviews: BankReview[],
  userIds: string[],
  context: string,
): void => {
  for (const userId of userIds) {
    const user = users.find((entry) => entry.id === userId)
    if (!user?.isActive) {
      throw new MasterDataError(`${context}: user not found`, 404, 'missing_entity')
    }
    if (!isBankApprovedUser(userId, bankReviews)) {
      throw new MasterDataError(
        `${context}: user ${userId} is not bank-approved for marketplace contracts`,
        403,
        'bank_approval_required',
      )
    }
  }
}
