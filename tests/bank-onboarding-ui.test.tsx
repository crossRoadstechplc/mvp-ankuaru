import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OnboardingReviewActions } from '@/components/bank/onboarding-review-actions'
import { OnboardingReviewList } from '@/components/bank/onboarding-review-list'
import type { BankReview, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const bankUsers: User[] = [
  {
    id: 'user-bank-001',
    name: 'Test Bank',
    email: 'bank@test',
    role: 'bank',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

const applicant: User = {
  id: 'user-applicant-1',
  name: 'Applicant One',
  email: 'a@t',
  role: 'importer',
  isActive: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const usersById = new Map<string, User>([[applicant.id, applicant]])

const review = (overrides: Partial<BankReview> = {}): BankReview => ({
  id: 'bank-review-test-1',
  applicantUserId: applicant.id,
  reviewerBankUserId: 'user-bank-001',
  reviewStatus: 'PENDING_REVIEW',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('OnboardingReviewList', () => {
  it('renders applicant name, role, and status with link to detail', () => {
    render(
      <OnboardingReviewList
        reviews={[review({ reviewStatus: 'BACKGROUND_CHECK_IN_PROGRESS' })]}
        usersById={usersById}
        detailPathPrefix="/bank/onboarding"
      />,
    )

    expect(screen.getByText('Applicant One')).toBeInTheDocument()
    expect(screen.getByText(/importer/i)).toBeInTheDocument()
    expect(screen.getByText(/inactive/i)).toBeInTheDocument()
    expect(screen.getByText(/background check in progress/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Applicant One/i })
    expect(link.getAttribute('href')).toBe('/bank/onboarding/bank-review-test-1')
  })
})

describe('OnboardingReviewActions', () => {
  it('renders status fields and approve / reject actions', () => {
    render(
      <OnboardingReviewActions
        reviewId="r1"
        reviewStatus="PENDING_REVIEW"
        bankUsers={bankUsers}
        applicantCurrentRole="importer"
        initialNotes="Hello"
      />,
    )

    expect(screen.getByLabelText(/Bank officer/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Review status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Trading role after approval/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save status & fields/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Approve onboarding/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject onboarding/i })).toBeInTheDocument()
  })

  it('posts approve decision with bank user to onboarding API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ review: {}, applicant: {} }),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { reload: vi.fn() })

    render(
      <OnboardingReviewActions
        reviewId="rev-99"
        reviewStatus="PENDING_REVIEW"
        bankUsers={bankUsers}
        applicantCurrentRole="importer"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Approve onboarding/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/bank/onboarding-review') as [string, RequestInit]
    expect(call).toBeDefined()
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      reviewId: 'rev-99',
      bankUserId: 'user-bank-001',
      decision: 'approve',
      applicantRole: 'importer',
    })
  })

  it('posts save with reviewStatus when saving form', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('location', { reload: vi.fn() })

    render(
      <OnboardingReviewActions
        reviewId="rev-2"
        reviewStatus="PENDING_REVIEW"
        bankUsers={bankUsers}
        applicantCurrentRole="exporter"
      />,
    )

    fireEvent.change(screen.getByLabelText(/Review status/i), {
      target: { value: 'BACKGROUND_CHECK_IN_PROGRESS' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Save status & fields/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/bank/onboarding-review') as [string, RequestInit]
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>
    expect(body.reviewStatus).toBe('BACKGROUND_CHECK_IN_PROGRESS')
  })
})
