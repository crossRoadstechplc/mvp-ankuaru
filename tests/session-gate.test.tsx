import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionGate } from '@/components/auth/session-gate'
import { useSessionStore } from '@/store/session-store'

const mockReplace = vi.hoisted(() => vi.fn())
const mockPush = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}))

import { usePathname } from 'next/navigation'

describe('SessionGate', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
    mockReplace.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects to login when not authenticated on a protected route', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(
      <SessionGate>
        <div>protected</div>
      </SessionGate>,
    )
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'))
  })

  it('renders login content on /login when logged out', async () => {
    vi.mocked(usePathname).mockReturnValue('/login')
    render(
      <SessionGate>
        <div data-testid="login-page">login form</div>
      </SessionGate>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })

  it('shows logout and session label when authenticated on a protected route', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    useSessionStore.setState({
      currentUserId: 'user-admin-001',
      currentUserRole: 'admin',
      currentUserName: 'Platform Admin',
    })
    render(
      <SessionGate>
        <main data-testid="app">app</main>
      </SessionGate>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('app')).toBeInTheDocument()
    })
    expect(screen.getByTestId('session-user-label')).toHaveTextContent('Platform Admin')
    expect(screen.getByTestId('session-role-label')).toHaveTextContent('admin')
    expect(screen.getByTestId('logout-button')).toBeInTheDocument()
  })

  it('logout clears session and navigates to login', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    useSessionStore.setState({
      currentUserId: 'user-admin-001',
      currentUserRole: 'admin',
      currentUserName: 'Platform Admin',
    })
    render(
      <SessionGate>
        <div />
      </SessionGate>,
    )
    await waitFor(() => expect(screen.getByTestId('logout-button')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('logout-button'))
    expect(useSessionStore.getState().currentUserId).toBeNull()
    expect(mockPush).toHaveBeenCalledWith('/login')
  })
})
