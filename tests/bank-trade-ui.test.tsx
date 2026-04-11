import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BankTradeReviewForm } from '@/components/bank/bank-trade-review-form'
import { TradeFinancingBadges } from '@/components/trade/trade-financing-badges'
import type { Trade, User } from '@/lib/domain/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const bankUsers: User[] = [
  {
    id: 'user-bank-001',
    name: 'Test Bank',
    email: 'bank@test',
    role: 'bank',
    isActive: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
]

const baseTrade = (overrides: Partial<Trade> = {}): Trade => ({
  id: 'trade-t',
  rfqId: 'rfq-1',
  winningBidId: undefined,
  buyerUserId: 'b',
  sellerUserId: 's',
  lotIds: ['lot-1'],
  status: 'BANK_PENDING',
  bankApproved: false,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('TradeFinancingBadges', () => {
  it('shows Bank approved, Margin locked with percent, and Collateral active when flags are set', () => {
    render(
      <TradeFinancingBadges
        trade={{
          bankApproved: true,
          marginLocked: true,
          marginPercent: 18,
        }}
        collateralActive
      />,
    )
    expect(screen.getByText(/Bank approved/i)).toBeInTheDocument()
    expect(screen.getByText(/Margin locked \(18%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Collateral active/i)).toBeInTheDocument()
  })

  it('shows pending / inactive states when not approved', () => {
    render(
      <TradeFinancingBadges
        trade={{
          bankApproved: false,
          marginLocked: false,
          marginPercent: undefined,
        }}
        collateralActive={false}
      />,
    )
    expect(screen.getByText(/Bank pending/i)).toBeInTheDocument()
    expect(screen.getByText(/Margin not locked/i)).toBeInTheDocument()
    expect(screen.getByText(/Collateral inactive/i)).toBeInTheDocument()
  })
})

describe('BankTradeReviewForm', () => {
  it('renders margin, notes, and approve action for pending trade', () => {
    render(<BankTradeReviewForm trade={baseTrade()} bankUsers={bankUsers} anyLotCollateral={false} />)

    expect(screen.getByLabelText(/Margin % \(buyer upfront\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Financing notes \/ terms/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Approve & lock margin/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject financing/i })).toBeInTheDocument()
  })

  it('submits approve payload with margin and notes to bank API', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ trade: { id: 'trade-t' } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    render(<BankTradeReviewForm trade={baseTrade()} bankUsers={bankUsers} anyLotCollateral={false} />)

    fireEvent.change(screen.getByLabelText(/Margin % \(buyer upfront\)/i), { target: { value: '25' } })
    fireEvent.change(screen.getByLabelText(/Financing notes \/ terms/i), {
      target: { value: 'Fixed facility' },
    })

    fireEvent.click(screen.getByRole('button', { name: /Approve & lock margin/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const call = fetchMock.mock.calls.find((c) => c[0] === '/api/bank/trade-review') as [string, RequestInit]
    expect(call).toBeDefined()
    const body = JSON.parse(call[1].body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      tradeId: 'trade-t',
      bankUserId: 'user-bank-001',
      decision: 'approve',
      marginPercent: 25,
      financingNotes: 'Fixed facility',
    })
    await waitFor(() => expect(reload).toHaveBeenCalled())
  })

  it('shows badges and terms when trade is already bank approved', () => {
    render(
      <BankTradeReviewForm
        trade={baseTrade({
          bankApproved: true,
          marginLocked: true,
          marginPercent: 15,
          financingNotes: 'Net 30',
          simulationSellerPaidByBank: true,
        })}
        bankUsers={bankUsers}
        anyLotCollateral
      />,
    )

    expect(screen.getByText(/Bank approved/i)).toBeInTheDocument()
    expect(screen.getByText(/Margin locked \(15%\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Collateral active/i)).toBeInTheDocument()
    expect(screen.getByText(/Net 30/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Approve & lock margin/i })).not.toBeInTheDocument()
  })
})
