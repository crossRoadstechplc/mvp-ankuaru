import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

import { AuthenticatedAppShell } from '@/components/layout/authenticated-app-shell'
import { HomeDashboard } from '@/components/home-dashboard'
import { cloneSeedData } from '@/data/seed-data'

import { resetUiAndSessionForTest, seedAdminSession, seedFarmerSession } from './helpers/mock-session'

const renderHomeWithShell = (store: ReturnType<typeof cloneSeedData>) =>
  render(
    <AuthenticatedAppShell>
      <HomeDashboard store={store} />
    </AuthenticatedAppShell>,
  )

describe('HomeDashboard role switching', () => {
  beforeEach(() => {
    resetUiAndSessionForTest()
    seedAdminSession()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the current role and updates the selected user when the role changes', () => {
    renderHomeWithShell(cloneSeedData())

    expect(screen.getAllByText('Current selected role')).toHaveLength(1)
    expect(screen.getAllByRole('heading', { name: /admin/i })).not.toHaveLength(0)
    expect(screen.getByText(/Active user: Platform Admin/)).toBeInTheDocument()
    expect(within(screen.getByTestId('role-dashboard-main')).getByRole('link', { name: 'Admin overview' })).toHaveAttribute(
      'href',
      '/admin',
    )

    fireEvent.change(screen.getByLabelText('Switch role'), {
      target: { value: 'farmer' },
    })

    expect(screen.getAllByRole('heading', { name: /farmer/i })).not.toHaveLength(0)
    expect(screen.getByText(/Active user: Alemu Bekele/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add field' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create pick' })).toBeInTheDocument()
  })

  it('shows bank-specific navigation and hides unrelated farmer actions', () => {
    renderHomeWithShell(cloneSeedData())

    fireEvent.change(screen.getByLabelText('Switch role'), {
      target: { value: 'bank' },
    })

    expect(screen.getAllByRole('heading', { name: /bank/i })).not.toHaveLength(0)
    const workspaceNav = screen.getByRole('navigation', { name: /workspace/i })
    expect(within(workspaceNav).getByRole('link', { name: 'Bank' })).toHaveAttribute('href', '/bank')
    expect(screen.queryByText('Add field')).not.toBeInTheDocument()
  })

  it('hides the role switcher for non-admin sessions', () => {
    resetUiAndSessionForTest()
    seedFarmerSession()
    renderHomeWithShell(cloneSeedData())
    expect(screen.queryByLabelText('Switch role')).not.toBeInTheDocument()
    expect(screen.getByText(/Signed in as/)).toBeInTheDocument()
  })

  it('keeps regulator dashboards read-only', () => {
    renderHomeWithShell(cloneSeedData())

    fireEvent.change(screen.getByLabelText('Switch role'), {
      target: { value: 'regulator' },
    })

    expect(screen.getAllByRole('heading', { name: /regulator/i })).not.toHaveLength(0)
    expect(screen.getByText(/Read-only workspace/)).toBeInTheDocument()
    expect(screen.queryByText('Admin overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Add field')).not.toBeInTheDocument()
  })

  it('surfaces processor processing CTA and discovery', () => {
    renderHomeWithShell(cloneSeedData())

    fireEvent.change(screen.getByLabelText('Switch role'), {
      target: { value: 'processor' },
    })

    const main = screen.getByTestId('role-dashboard-main')
    expect(within(main).getByRole('link', { name: 'Record processing' })).toHaveAttribute('href', '/processor/record')
    expect(screen.getAllByRole('link', { name: 'Discovery' }).length).toBeGreaterThanOrEqual(1)
  })
})
