import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { RfqBidsPanel } from '@/components/trade/rfq-bids-panel'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

import type { Bid, RFQ } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
})

const rfq: RFQ = {
  id: 'rfq-t',
  createdByUserId: 'user-exporter-001',
  quantity: 100,
  qualityRequirement: 'Q',
  location: 'L',
  status: 'OPEN',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

const bid: Bid = {
  id: 'bid-t',
  rfqId: 'rfq-t',
  bidderUserId: 'user-importer-001',
  price: 7.5,
  lotIds: ['lot-green-001'],
  status: 'SUBMITTED',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
}

describe('RfqBidsPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
    useUiStore.setState({
      selectedRole: 'exporter',
      selectedUserId: 'user-exporter-001',
    })
  })

  afterEach(() => {
    useSessionStore.getState().logout()
  })

  it('shows select button for exporter when session matches RFQ owner', () => {
    useSessionStore.setState({
      currentUserId: 'user-exporter-001',
      currentUserRole: 'exporter',
      currentUserName: 'E',
    })
    render(<RfqBidsPanel rfq={rfq} bids={[bid]} linkedTrade={null} />)
    expect(screen.getByRole('button', { name: /Select winning bid/i })).toBeInTheDocument()
  })

  it('hides price for farmer role', () => {
    useSessionStore.getState().logout()
    useUiStore.setState({ selectedRole: 'farmer', selectedUserId: null })
    render(<RfqBidsPanel rfq={rfq} bids={[bid]} linkedTrade={null} />)
    expect(screen.getByText(/Price restricted/i)).toBeInTheDocument()
  })
})
