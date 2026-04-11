// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postOnboarding } from '@/app/api/bank/onboarding-review/route'
import { POST as postBankReview } from '@/app/api/bankReviews/route'
import { POST as postUser } from '@/app/api/users/route'
import { applyBankOnboardingReview } from '@/lib/bank/onboarding-review'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const bankSession = { userId: 'user-bank-001', role: 'bank' as const }
const exporterSession = { userId: 'user-exporter-001', role: 'exporter' as const }

const createInactiveApplicantAndPendingReview = async (projectRoot: string) => {
  const email = `applicant-${Date.now()}@ankuaru.test`
  const userRes = await postUser(
    withProjectRoot(projectRoot, {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Applicant',
        email,
        role: 'importer',
        isActive: false,
      }),
    }),
  )
  expect(userRes.status).toBe(201)
  const applicant = (await userRes.json()) as { id: string }

  const reviewRes = await postBankReview(
    withProjectRoot(projectRoot, {
      method: 'POST',
      body: JSON.stringify({
        applicantUserId: applicant.id,
        reviewerBankUserId: 'user-bank-001',
        reviewStatus: 'PENDING_REVIEW',
        notes: 'Queued',
      }),
    }),
  )
  expect(reviewRes.status).toBe(201)
  const review = (await reviewRes.json()) as { id: string }
  return { applicantId: applicant.id, reviewId: review.id }
}

describe('bank onboarding review API', () => {
  it('activates applicant when decision is approve', async () => {
    const projectRoot = await createTempProjectRoot()
    const { applicantId, reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    const res = await postOnboarding(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            reviewId,
            bankUserId: 'user-bank-001',
            decision: 'approve',
            financialAssessment: 'Within limits',
            notes: 'Cleared',
          }),
        },
        bankSession,
      ),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { applicant: { id: string; isActive: boolean }; review: { reviewStatus: string } }
    expect(body.review.reviewStatus).toBe('APPROVED')
    expect(body.applicant.isActive).toBe(true)

    const store = await readLiveDataStore(projectRoot)
    const user = store.users.find((u) => u.id === applicantId)
    expect(user?.isActive).toBe(true)
  })

  it('deactivates applicant when decision is reject', async () => {
    const projectRoot = await createTempProjectRoot()
    const { applicantId, reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    const res = await postOnboarding(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            reviewId,
            bankUserId: 'user-bank-001',
            decision: 'reject',
            notes: 'Policy decline',
          }),
        },
        bankSession,
      ),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { applicant: { isActive: boolean } }
    expect(body.applicant.isActive).toBe(false)

    const store = await readLiveDataStore(projectRoot)
    expect(store.users.find((u) => u.id === applicantId)?.isActive).toBe(false)
    const rev = store.bankReviews.find((r) => r.id === reviewId)
    expect(rev?.reviewStatus).toBe('REJECTED')
    expect(rev?.rejectedAt).toBeDefined()
  })

  it('returns 403 for non-bank non-admin actor', async () => {
    const projectRoot = await createTempProjectRoot()
    const { reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    const res = await postOnboarding(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            reviewId,
            bankUserId: 'user-exporter-001',
            decision: 'approve',
          }),
        },
        exporterSession,
      ),
    )
    expect(res.status).toBe(403)
  })

  it('returns 404 for unknown review id', async () => {
    const projectRoot = await createTempProjectRoot()

    const res = await postOnboarding(
      withProjectRoot(
        projectRoot,
        {
          method: 'POST',
          body: JSON.stringify({
            reviewId: 'bank-review-missing',
            bankUserId: 'user-bank-001',
            decision: 'approve',
          }),
        },
        bankSession,
      ),
    )
    expect(res.status).toBe(404)
  })
})

describe('onboarding state transitions & user activation', () => {
  it('moves PENDING_REVIEW to BACKGROUND_CHECK_IN_PROGRESS and keeps applicant inactive', async () => {
    const projectRoot = await createTempProjectRoot()
    const { applicantId, reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    await applyBankOnboardingReview(
      {
        reviewId,
        bankUserId: 'user-bank-001',
        reviewStatus: 'BACKGROUND_CHECK_IN_PROGRESS',
        backgroundCheckStatus: 'Vendor ping sent',
      },
      projectRoot,
    )

    const store = await readLiveDataStore(projectRoot)
    expect(store.bankReviews.find((r) => r.id === reviewId)?.reviewStatus).toBe('BACKGROUND_CHECK_IN_PROGRESS')
    expect(store.users.find((u) => u.id === applicantId)?.isActive).toBe(false)
  })

  it('approves after background check and activates user', async () => {
    const projectRoot = await createTempProjectRoot()
    const { applicantId, reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    await applyBankOnboardingReview(
      { reviewId, bankUserId: 'user-bank-001', reviewStatus: 'BACKGROUND_CHECK_IN_PROGRESS' },
      projectRoot,
    )
    await applyBankOnboardingReview({ reviewId, bankUserId: 'user-bank-001', decision: 'approve' }, projectRoot)

    const store = await readLiveDataStore(projectRoot)
    expect(store.bankReviews.find((r) => r.id === reviewId)?.reviewStatus).toBe('APPROVED')
    expect(store.users.find((u) => u.id === applicantId)?.isActive).toBe(true)
  })

  it('deactivates user when moving from APPROVED to PENDING_REVIEW', async () => {
    const projectRoot = await createTempProjectRoot()
    const { applicantId, reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    await applyBankOnboardingReview({ reviewId, bankUserId: 'user-admin-001', decision: 'approve' }, projectRoot)
    expect((await readLiveDataStore(projectRoot)).users.find((u) => u.id === applicantId)?.isActive).toBe(true)

    await applyBankOnboardingReview(
      { reviewId, bankUserId: 'user-bank-001', reviewStatus: 'PENDING_REVIEW', notes: 'Re-opened for docs' },
      projectRoot,
    )

    const store = await readLiveDataStore(projectRoot)
    expect(store.users.find((u) => u.id === applicantId)?.isActive).toBe(false)
    expect(store.bankReviews.find((r) => r.id === reviewId)?.reviewStatus).toBe('PENDING_REVIEW')
  })

  it('allows admin user as reviewer', async () => {
    const projectRoot = await createTempProjectRoot()
    const { reviewId } = await createInactiveApplicantAndPendingReview(projectRoot)

    const { review } = await applyBankOnboardingReview(
      { reviewId, bankUserId: 'user-admin-001', decision: 'approve' },
      projectRoot,
    )
    expect(review.reviewerBankUserId).toBe('user-admin-001')
  })
})
