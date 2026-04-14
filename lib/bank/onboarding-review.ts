import { BANK_REVIEW_STATUS_VALUES } from '@/lib/domain/constants'
import type { BankReview, BankReviewStatus, Role, User } from '@/lib/domain/types'
import { MasterDataError } from '@/lib/master-data/crud'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

const asTrimmedString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
  return value.trim()
}

const asOptionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  return asTrimmedString(value, label)
}

const TRADE_ROLES_BANK_ONBOARD: Role[] = ['exporter', 'importer', 'processor']

const parseOptionalApplicantTradeRole = (value: unknown): Role | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error('onboardingReview.applicantRole must be a string')
  }
  const trimmed = value.trim()
  if (!TRADE_ROLES_BANK_ONBOARD.includes(trimmed as Role)) {
    throw new Error('onboardingReview.applicantRole must be exporter, importer, or processor')
  }
  return trimmed as Role
}

/** Simulator-only: bank or admin updates onboarding review and syncs applicant `isActive` from final status. */
export type BankOnboardingReviewRequest = {
  reviewId: string
  bankUserId: string
  /** Sets status to APPROVED and activates applicant (and timestamps). */
  decision?: 'approve' | 'reject'
  reviewStatus?: BankReviewStatus
  financialAssessment?: string
  backgroundCheckStatus?: string
  notes?: string
  /** When decision is approve, optionally set applicant marketplace role (trading roles only). */
  applicantRole?: Role
}

export const parseBankOnboardingReviewRequest = (value: unknown): BankOnboardingReviewRequest => {
  const input = asRecord(value, 'onboardingReview')
  const decisionRaw = input.decision
  if (
    decisionRaw !== undefined &&
    decisionRaw !== null &&
    decisionRaw !== '' &&
    decisionRaw !== 'approve' &&
    decisionRaw !== 'reject'
  ) {
    throw new Error('onboardingReview.decision must be approve or reject')
  }
  let reviewStatus: BankReviewStatus | undefined
  if (input.reviewStatus !== undefined && input.reviewStatus !== null && input.reviewStatus !== '') {
    const rs = input.reviewStatus
    if (typeof rs !== 'string' || !BANK_REVIEW_STATUS_VALUES.includes(rs as BankReviewStatus)) {
      throw new Error('onboardingReview.reviewStatus is invalid')
    }
    reviewStatus = rs as BankReviewStatus
  }

  return {
    reviewId: asTrimmedString(input.reviewId, 'onboardingReview.reviewId'),
    bankUserId: asTrimmedString(input.bankUserId, 'onboardingReview.bankUserId'),
    decision: decisionRaw === 'approve' || decisionRaw === 'reject' ? decisionRaw : undefined,
    reviewStatus,
    financialAssessment: asOptionalString(input.financialAssessment, 'onboardingReview.financialAssessment'),
    backgroundCheckStatus: asOptionalString(
      input.backgroundCheckStatus,
      'onboardingReview.backgroundCheckStatus',
    ),
    notes: asOptionalString(input.notes, 'onboardingReview.notes'),
    applicantRole: parseOptionalApplicantTradeRole(input.applicantRole),
  }
}

const timestamp = () => new Date().toISOString()

const applicantActivationForStatus = (status: BankReviewStatus): boolean => status === 'APPROVED'

export type BankOnboardingReviewOutcome = {
  review: BankReview
  applicant: User
}

/**
 * Bank (or admin) updates a bank onboarding review. Applicant user `isActive` follows review status:
 * APPROVED → active; REJECTED, PENDING_REVIEW, BACKGROUND_CHECK_IN_PROGRESS → inactive (simulator).
 */
export const applyBankOnboardingReview = async (
  payload: unknown,
  projectRoot: string,
): Promise<BankOnboardingReviewOutcome> => {
  try {
    const req = parseBankOnboardingReviewRequest(payload)
    const store = await readLiveDataStore(projectRoot)

    const actor = store.users.find((u) => u.id === req.bankUserId)
    if (!actor?.isActive) {
      throw new MasterDataError('Bank user not found', 404, 'missing_entity')
    }
    if (actor.role !== 'bank' && actor.role !== 'admin') {
      throw new MasterDataError('Only bank or admin users can update onboarding reviews', 403, 'forbidden_role')
    }

    const reviewIndex = store.bankReviews.findIndex((r) => r.id === req.reviewId)
    if (reviewIndex < 0) {
      throw new MasterDataError('Bank review not found', 404, 'missing_entity')
    }

    const prev = store.bankReviews[reviewIndex]
    const ts = timestamp()

    let nextStatus: BankReviewStatus = prev.reviewStatus
    if (req.decision === 'approve') {
      nextStatus = 'APPROVED'
    } else if (req.decision === 'reject') {
      nextStatus = 'REJECTED'
    } else if (req.reviewStatus !== undefined) {
      nextStatus = req.reviewStatus
    } else if (
      req.financialAssessment === undefined &&
      req.backgroundCheckStatus === undefined &&
      req.notes === undefined
    ) {
      throw new MasterDataError(
        'Provide decision, reviewStatus, or at least one of notes / financialAssessment / backgroundCheckStatus',
        400,
        'invalid_payload',
      )
    }

    let approvedAt = prev.approvedAt
    let rejectedAt = prev.rejectedAt

    if (nextStatus === 'APPROVED') {
      if (prev.reviewStatus !== 'APPROVED') {
        approvedAt = ts
      }
      rejectedAt = undefined
    } else if (nextStatus === 'REJECTED') {
      if (prev.reviewStatus !== 'REJECTED') {
        rejectedAt = ts
      }
      approvedAt = undefined
    } else {
      if (prev.reviewStatus === 'APPROVED' || prev.reviewStatus === 'REJECTED') {
        approvedAt = undefined
        rejectedAt = undefined
      }
    }

    const nextReview: BankReview = {
      ...prev,
      reviewerBankUserId: req.bankUserId,
      reviewStatus: nextStatus,
      financialAssessment:
        req.financialAssessment !== undefined ? req.financialAssessment : prev.financialAssessment,
      backgroundCheckStatus:
        req.backgroundCheckStatus !== undefined ? req.backgroundCheckStatus : prev.backgroundCheckStatus,
      notes: req.notes !== undefined ? req.notes : prev.notes,
      approvedAt,
      rejectedAt,
      updatedAt: ts,
    }

    store.bankReviews[reviewIndex] = nextReview

    const applicantIndex = store.users.findIndex((u) => u.id === prev.applicantUserId)
    if (applicantIndex < 0) {
      throw new MasterDataError('Applicant user not found', 404, 'missing_applicant')
    }

    const applicant = store.users[applicantIndex]
    const shouldActivate = applicantActivationForStatus(nextStatus)
    let nextRole = applicant.role
    if (req.decision === 'approve' && req.applicantRole !== undefined) {
      if (!TRADE_ROLES_BANK_ONBOARD.includes(req.applicantRole)) {
        throw new MasterDataError('applicantRole must be exporter, importer, or processor', 400, 'invalid_payload')
      }
      nextRole = req.applicantRole
    }
    store.users[applicantIndex] = {
      ...applicant,
      role: nextRole,
      isActive: shouldActivate,
      updatedAt: ts,
    }

    await writeLiveDataStore(store, projectRoot)

    return { review: nextReview, applicant: store.users[applicantIndex] }
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }
    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid onboarding review payload',
      400,
      'invalid_payload',
    )
  }
}
