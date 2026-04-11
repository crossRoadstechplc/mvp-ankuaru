/**
 * Route-level shell consistency: same single workspace nav for dashboard vs deep routes per role.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pathnameRef = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

import { resetUiAndSessionForTest } from './helpers/mock-session'

describe('shell route coverage', () => {
  beforeEach(() => {
    resetUiAndSessionForTest()
  })

  afterEach(() => {
    cleanup()
  })

  it('aggregator dashboard and create-aggregation action share one nav with Discovery', () => {
    useSessionStore.setState({
      currentUserId: 'user-aggregator-001',
      currentUserRole: 'aggregator',
      currentUserName: 'Test Aggregator',
    })
    useUiStore.setState({ selectedRole: 'aggregator', selectedUserId: 'user-aggregator-001' })

    pathnameRef.current = '/'
    const { unmount: u1 } = render(
      <AuthenticatedAppShell>
        <div>dash</div>
      </AuthenticatedAppShell>,
    )
    let navs = screen.getAllByRole('navigation', { name: /workspace/i })
    expect(navs).toHaveLength(1)
    expect(within(navs[0]).getAllByRole('link', { name: 'Discovery' }).length).toBeGreaterThanOrEqual(1)
    u1()
    cleanup()

    pathnameRef.current = '/actions/create-aggregation'
    render(
      <AuthenticatedAppShell>
        <div>action</div>
      </AuthenticatedAppShell>,
    )
    navs = screen.getAllByRole('navigation', { name: /workspace/i })
    expect(navs).toHaveLength(1)
    expect(within(navs[0]).getAllByRole('link', { name: 'Discovery' }).length).toBeGreaterThanOrEqual(1)
  })

  it('farmer dashboard path shows farmer capability links', () => {
    useSessionStore.setState({
      currentUserId: 'user-farmer-001',
      currentUserRole: 'farmer',
      currentUserName: 'Farmer',
    })
    pathnameRef.current = '/farmer/lots'

    render(
      <AuthenticatedAppShell>
        <div>farmer</div>
      </AuthenticatedAppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(nav).getByRole('link', { name: 'Lots' })).toHaveAttribute('href', '/farmer/lots')
  })

  it('processor home shows Discovery and Record processing in sidebar', () => {
    useSessionStore.setState({
      currentUserId: 'user-processor-001',
      currentUserRole: 'processor',
      currentUserName: 'Processor',
    })
    pathnameRef.current = '/'

    render(
      <AuthenticatedAppShell>
        <div>proc</div>
      </AuthenticatedAppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(nav).getByRole('link', { name: 'Discovery' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Processor workspace' })).toHaveAttribute('href', '/processor')
    expect(within(nav).getByRole('link', { name: 'Record processing' })).toHaveAttribute('href', '/processor/record')
  })

  it('bank workspace shows bank nav on /bank', () => {
    useSessionStore.setState({
      currentUserId: 'user-bank-001',
      currentUserRole: 'bank',
      currentUserName: 'Bank',
    })
    pathnameRef.current = '/bank'

    render(
      <AuthenticatedAppShell>
        <div>bank</div>
      </AuthenticatedAppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(nav).getByRole('link', { name: 'Bank' })).toHaveAttribute('href', '/bank')
  })
})
