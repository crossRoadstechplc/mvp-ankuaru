import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { getEligibleLoginUsers, isLoginEligibleUser } from '@/lib/auth/login-eligibility'
import type { BankReview, User } from '@/lib/domain/types'

describe('login eligibility', () => {
  it('includes active users without a bank onboarding review', () => {
    const store = cloneSeedData()
    const u = store.users.find((x) => x.id === 'user-farmer-001')
    expect(u).toBeDefined()
    expect(isLoginEligibleUser(u!, store.bankReviews)).toBe(true)
  })

  it('excludes inactive users even without a bank review', () => {
    const user: User = {
      id: 'u-inactive',
      name: 'Inactive',
      role: 'farmer',
      isActive: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    expect(isLoginEligibleUser(user, [])).toBe(false)
  })

  it('excludes active users with a non-approved bank onboarding review', () => {
    const user: User = {
      id: 'u-pend',
      name: 'Pending Co',
      role: 'importer',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const reviews: BankReview[] = [
      {
        id: 'br-1',
        applicantUserId: 'u-pend',
        reviewerBankUserId: 'user-bank-001',
        reviewStatus: 'PENDING_REVIEW',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    expect(isLoginEligibleUser(user, reviews)).toBe(false)
  })

  it('includes active users when bank review is APPROVED', () => {
    const user: User = {
      id: 'u-ok',
      name: 'Cleared Co',
      role: 'exporter',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const reviews: BankReview[] = [
      {
        id: 'br-1',
        applicantUserId: 'u-ok',
        reviewerBankUserId: 'user-bank-001',
        reviewStatus: 'APPROVED',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]
    expect(isLoginEligibleUser(user, reviews)).toBe(true)
  })

  it('getEligibleLoginUsers matches seed expectations (no inactive onboard-only users)', () => {
    const store = cloneSeedData()
    const ids = new Set(getEligibleLoginUsers(store).map((u) => u.id))
    expect(ids.has('user-onboard-pending-001')).toBe(false)
    expect(ids.has('user-onboard-bg-001')).toBe(false)
    expect(ids.has('user-onboard-rejected-001')).toBe(false)
    expect(ids.has('user-onboard-approved-001')).toBe(true)
    expect(ids.has('user-farmer-001')).toBe(true)
  })
})
