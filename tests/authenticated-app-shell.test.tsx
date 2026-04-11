import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pathnameRef = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'
import { useUiStore } from '@/store/ui-store'

import { resetUiAndSessionForTest, seedAdminSession } from './helpers/mock-session'

describe('AuthenticatedAppShell', () => {
  beforeEach(() => {
    resetUiAndSessionForTest()
    seedAdminSession()
    pathnameRef.current = '/'
  })

  afterEach(() => {
    cleanup()
  })

  it('renders a single sidebar with Discovery for aggregator preview on home', () => {
    useUiStore.setState({ selectedRole: 'aggregator', selectedUserId: 'user-aggregator-001' })
    pathnameRef.current = '/'

    render(
      <AuthenticatedAppShell>
        <div data-testid="page">Home</div>
      </AuthenticatedAppShell>,
    )

    const sidebars = screen.getAllByRole('navigation', { name: /workspace/i })
    expect(sidebars).toHaveLength(1)
    expect(within(sidebars[0]).getByRole('link', { name: 'Discovery' })).toHaveAttribute('href', '/discovery')
    expect(within(sidebars[0]).getByRole('link', { name: /Create aggregation/i })).toBeInTheDocument()
  })

  it('does not nest a second workspace nav inside action routes', () => {
    useUiStore.setState({ selectedRole: 'aggregator', selectedUserId: 'user-aggregator-001' })
    pathnameRef.current = '/actions/create-aggregation'

    render(
      <AuthenticatedAppShell>
        <div data-testid="action-child">Aggregate UI</div>
      </AuthenticatedAppShell>,
    )

    expect(screen.getAllByRole('navigation', { name: /workspace/i })).toHaveLength(1)
    expect(screen.getByTestId('action-child')).toBeInTheDocument()
  })

  it('uses admin sidebar when path is under /admin', () => {
    pathnameRef.current = '/admin/lots'

    render(
      <AuthenticatedAppShell>
        <div>Admin body</div>
      </AuthenticatedAppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(nav).getByRole('link', { name: /Lots/i })).toHaveAttribute('href', '/admin/lots')
  })
})
