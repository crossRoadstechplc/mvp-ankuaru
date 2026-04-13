import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const pathnameRef = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'
import { LotLifecycleStrip } from '@/components/lot/lot-lifecycle-strip'
import { HomeDashboard } from '@/components/home-dashboard'
import { cloneSeedData } from '@/data/seed-data'
import { useSessionStore } from '@/store/session-store'

import { resetUiAndSessionForTest, seedAdminSession } from './helpers/mock-session'

describe('R8 lot lifecycle strip', () => {
  it('renders the journey story with traceability link', () => {
    render(<LotLifecycleStrip />)
    const strip = screen.getByTestId('lot-lifecycle-strip')
    expect(within(strip).getByText('Farmer origin')).toBeInTheDocument()
    expect(within(strip).getByRole('link', { name: 'Traceability' })).toHaveAttribute('href', '/lots/lot-green-001')
  })
})

describe('R8 home dashboard structure', () => {
  beforeEach(() => {
    resetUiAndSessionForTest()
    seedAdminSession()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows workspace next-step grid', () => {
    render(
      <AuthenticatedAppShell>
        <HomeDashboard store={cloneSeedData()} />
      </AuthenticatedAppShell>,
    )

    const main = screen.getByTestId('role-dashboard-main')
    expect(within(main).getByText('Your workspace')).toBeInTheDocument()
    expect(within(main).getByText(/Start here/i)).toBeInTheDocument()
    expect(within(main).getByText(/What matters now/i)).toBeInTheDocument()
    expect(within(main).getByText(/Where next/i)).toBeInTheDocument()
    expect(screen.getByText('Focus areas')).toBeInTheDocument()
  })
})

describe('R8 regulator nav includes Discovery', () => {
  beforeEach(() => {
    resetUiAndSessionForTest()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows Discovery in sidebar for regulator session', () => {
    useSessionStore.setState({
      currentUserId: 'user-regulator-001',
      currentUserRole: 'regulator',
      currentUserName: 'Regulator',
    })
    pathnameRef.current = '/regulator'

    render(
      <AuthenticatedAppShell>
        <div>reg</div>
      </AuthenticatedAppShell>,
    )

    const nav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(nav).getByRole('link', { name: 'Discovery' })).toHaveAttribute('href', '/discovery')
    expect(within(nav).getByRole('link', { name: 'Oversight' })).toHaveAttribute('href', '/regulator')
  })
})
