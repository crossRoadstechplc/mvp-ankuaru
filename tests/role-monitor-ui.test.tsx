import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RoleMonitorClient } from '@/components/admin/role-monitor-client'
import { DEFAULT_ADMIN_PREVIEW_KEY } from '@/lib/admin/preview-constants'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RoleMonitorClient', () => {
  it('renders sidebar, preview panel, and control buttons', () => {
    render(<RoleMonitorClient />)
    expect(screen.getByTestId('role-monitor-sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('role-monitor-preview-panel')).toBeInTheDocument()
    expect(screen.getByTestId('start-preview-session')).toBeInTheDocument()
    expect(screen.queryByTestId('reload-preview')).not.toBeInTheDocument()
  })

  it('starts session and shows iframe after successful API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/api/admin/preview-sessions') && init?.method === 'POST') {
        return new Response(JSON.stringify({ previewId: 'pv-mock123', projectRoot: '/tmp/x' }), { status: 201 })
      }
      if (url.includes('/api/live-data')) {
        return new Response(
          JSON.stringify({
            users: [{ id: 'u1', name: 'A', role: 'farmer', email: '', isActive: true, createdAt: '', updatedAt: '' }],
            lots: [],
            events: [],
            fields: [],
            farmerProfiles: [],
            rfqs: [],
            bids: [],
            trades: [],
            labResults: [],
            bankReviews: [],
            vehicles: [],
            drivers: [],
          }),
          { status: 200 },
        )
      }
      return new Response('{}', { status: 404 })
    })

    render(<RoleMonitorClient />)
    fireEvent.change(screen.getByTestId('admin-preview-key-input'), {
      target: { value: DEFAULT_ADMIN_PREVIEW_KEY },
    })
    fireEvent.click(screen.getByTestId('start-preview-session'))

    await waitFor(() => {
      expect(screen.getByTestId('role-monitor-iframe')).toBeInTheDocument()
    })
    expect(screen.getByTestId('reload-preview')).toBeInTheDocument()
    expect(screen.getByTestId('reset-preview-session')).toBeInTheDocument()
    expect(screen.getByTestId('end-preview-session')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('reload-preview'))
    const iframe = screen.getByTestId('role-monitor-iframe') as HTMLIFrameElement
    expect(iframe.src).toContain('previewId=pv-mock123')

    fetchMock.mockRestore()
  })

  it('reset session triggers reset API then reloads iframe key', async () => {
    let resetCalled = false
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/reset')) {
        resetCalled = true
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      if (url.includes('/api/admin/preview-sessions') && (init as { method?: string })?.method === 'POST') {
        return new Response(JSON.stringify({ previewId: 'pv-reset1', projectRoot: '/tmp/x' }), { status: 201 })
      }
      if (url.includes('/api/live-data')) {
        return new Response(
          JSON.stringify({
            users: [{ id: 'u1', name: 'A', role: 'farmer', email: '', isActive: true, createdAt: '', updatedAt: '' }],
            lots: [],
            events: [],
            fields: [],
            farmerProfiles: [],
            rfqs: [],
            bids: [],
            trades: [],
            labResults: [],
            bankReviews: [],
            vehicles: [],
            drivers: [],
          }),
          { status: 200 },
        )
      }
      return new Response('{}', { status: 404 })
    })

    render(<RoleMonitorClient />)
    fireEvent.click(screen.getByTestId('start-preview-session'))
    await waitFor(() => expect(screen.getByTestId('reset-preview-session')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('reset-preview-session'))
    await waitFor(() => expect(resetCalled).toBe(true))

    fetchMock.mockRestore()
  })
})
