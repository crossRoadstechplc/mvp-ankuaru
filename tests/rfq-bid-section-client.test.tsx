import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { RfqBidSectionClient } from '@/components/trade/rfq-bid-section-client'
import type { Lot, RFQ, User } from '@/lib/domain/types'
import { useSessionStore } from '@/store/session-store'

afterEach(() => {
  cleanup()
  localStorage.clear()
  useSessionStore.getState().logout()
})

const rfq: RFQ = {
  id: 'rfq-open',
  createdByUserId: 'user-exporter-001',
  quantity: 50,
  qualityRequirement: 'Q',
  location: 'L',
  status: 'OPEN',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const bidderUsers: User[] = [
  {
    id: 'user-exporter-001',
    name: 'E',
    role: 'exporter',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

const lots: Lot[] = []

describe('RfqBidSectionClient', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
  })

  it('shows view-only copy for farmer on open RFQ', () => {
    useSessionStore.setState({
      currentUserId: 'user-farmer-001',
      currentUserRole: 'farmer',
      currentUserName: 'Farmer',
    })
    render(<RfqBidSectionClient rfq={rfq} bidderUsers={bidderUsers} lots={lots} />)
    expect(screen.getByText(/View only/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Submit bid/i })).not.toBeInTheDocument()
  })

  it('renders submit form for exporter on open RFQ', () => {
    useSessionStore.setState({
      currentUserId: 'user-exporter-001',
      currentUserRole: 'exporter',
      currentUserName: 'E',
    })
    render(<RfqBidSectionClient rfq={rfq} bidderUsers={bidderUsers} lots={lots} />)
    expect(screen.getByRole('button', { name: /Submit bid/i })).toBeInTheDocument()
  })
})
