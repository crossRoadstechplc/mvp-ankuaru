import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminRouteGate } from '@/components/auth/admin-route-gate'
import { useSessionStore } from '@/store/session-store'

import { resetUiAndSessionForTest, seedAdminSession, seedFarmerSession } from './helpers/mock-session'

const mockReplace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))

describe('AdminRouteGate', () => {
  beforeEach(() => {
    localStorage.clear()
    resetUiAndSessionForTest()
    mockReplace.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects non-admin sessions away from admin UI', async () => {
    seedFarmerSession()
    render(
      <AdminRouteGate>
        <div data-testid="admin-secret">secret</div>
      </AdminRouteGate>,
    )
    expect(screen.queryByTestId('admin-secret')).not.toBeInTheDocument()
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'))
  })

  it('renders children for admin role', async () => {
    seedAdminSession()
    render(
      <AdminRouteGate>
        <div data-testid="admin-secret">secret</div>
      </AdminRouteGate>,
    )
    await waitFor(() => expect(screen.getByTestId('admin-secret')).toBeInTheDocument())
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
