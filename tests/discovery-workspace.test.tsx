import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
  }),
}))

import { DiscoveryWorkspace } from '@/components/discovery/discovery-workspace'
import { cloneSeedData } from '@/data/seed-data'
import type { Role } from '@/lib/domain/types'
import { ROLE_CAPABILITIES } from '@/lib/roles/capabilities'
import { useSessionStore } from '@/store/session-store'

afterEach(() => {
  cleanup()
  localStorage.clear()
  useSessionStore.getState().logout()
})

describe('DiscoveryWorkspace', () => {
  const store = cloneSeedData()

  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
  })

  it('shows read-only mode for farmer session', () => {
    useSessionStore.setState({
      currentUserId: 'user-farmer-001',
      currentUserRole: 'farmer',
      currentUserName: 'Alemu Bekele',
    })
    render(<DiscoveryWorkspace store={store} />)
    expect(screen.getByText(/Read-only — processor \/ exporter \/ importer posting only/i)).toBeInTheDocument()
    expect(screen.queryByText('My actions')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New RFQ' })).not.toBeInTheDocument()
    expect(screen.getAllByTestId('discovery-rfq-view-only-badge').length).toBeGreaterThan(0)
  })

  it('shows actor controls for exporter session', () => {
    useSessionStore.setState({
      currentUserId: 'user-exporter-001',
      currentUserRole: 'exporter',
      currentUserName: 'Exporter',
    })
    render(<DiscoveryWorkspace store={store} />)
    expect(screen.getByText('Trade actions enabled')).toBeInTheDocument()
    expect(screen.getByText('My actions')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New RFQ' })).toBeInTheDocument()
  })

  it('orders open opportunities before my actions for exporter', () => {
    useSessionStore.setState({
      currentUserId: 'user-exporter-001',
      currentUserRole: 'exporter',
      currentUserName: 'Exporter',
    })
    render(<DiscoveryWorkspace store={store} />)
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((el) => el.textContent)
    expect(h2.indexOf('Open opportunities')).toBeLessThan(h2.indexOf('My actions'))
    expect(h2.indexOf('My actions')).toBeLessThan(h2.indexOf('Selected / closed'))
  })

  it('shows actor controls for importer session', () => {
    useSessionStore.setState({
      currentUserId: 'user-importer-001',
      currentUserRole: 'importer',
      currentUserName: 'Importer',
    })
    render(<DiscoveryWorkspace store={store} />)
    expect(screen.getByRole('link', { name: 'New RFQ' })).toBeInTheDocument()
  })
})

describe('role navigation — Discovery', () => {
  const roles = Object.keys(ROLE_CAPABILITIES) as Role[]

  it('labels Discovery consistently when a role exposes it in navigation', () => {
    for (const role of roles) {
      const cap = ROLE_CAPABILITIES[role]
      const discovery = cap.navigation.find((item) => item.href === '/discovery')
      if (!discovery) {
        continue
      }
      expect(discovery.label).toBe('Discovery')
    }
  })
})
