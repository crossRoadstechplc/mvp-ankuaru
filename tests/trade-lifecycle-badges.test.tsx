import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TradeLifecycleBadges } from '@/components/trade/trade-lifecycle-badges'

afterEach(() => {
  cleanup()
})

describe('TradeLifecycleBadges', () => {
  it('shows settled and financed when trade is SETTLED and bank-financed', () => {
    render(
      <TradeLifecycleBadges
        trade={{
          status: 'SETTLED',
          bankApproved: true,
          marginLocked: true,
          bankRepaidSimulator: true,
        }}
      />,
    )
    expect(screen.getByText(/financed/i)).toBeInTheDocument()
    expect(screen.getByText(/settled/i)).toBeInTheDocument()
    expect(screen.getByText(/bank repaid/i)).toBeInTheDocument()
  })

  it('shows margin call and defaulted states', () => {
    render(
      <TradeLifecycleBadges
        trade={{
          status: 'DEFAULTED',
          bankApproved: true,
          marginLocked: true,
          marginCallAt: '2026-01-01',
          defaultedAt: '2026-01-02',
        }}
      />,
    )
    expect(screen.getByText(/margin call/i)).toBeInTheDocument()
    expect(screen.getByText(/defaulted/i)).toBeInTheDocument()
  })

  it('shows liquidated', () => {
    render(
      <TradeLifecycleBadges
        trade={{
          status: 'LIQUIDATED',
          bankApproved: true,
          marginLocked: true,
          liquidatedAt: '2026-01-03',
        }}
      />,
    )
    expect(screen.getByText(/liquidated/i)).toBeInTheDocument()
  })
})
