import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

import { AdminPerformanceTable } from '@/components/performance/admin-performance-table'
import { ActorRatingStrip } from '@/components/performance/actor-rating-strip'
import { cloneSeedData } from '@/data/seed-data'
import { computeActorPerformance } from '@/lib/performance/actor-ratings'

afterEach(() => {
  cleanup()
})

describe('ActorRatingStrip', () => {
  it('exposes composite score for tests and shows full breakdown in full variant', () => {
    const store = cloneSeedData()
    const rating = computeActorPerformance(store, 'user-lab-001')
    render(<ActorRatingStrip rating={rating} variant="full" />)
    const strip = screen.getByTestId('actor-rating-strip')
    expect(strip).toHaveAttribute('data-composite-score', String(rating.compositeScore))
    expect(screen.getByText('Timeliness')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('Quality adherence')).toBeInTheDocument()
  })
})

describe('AdminPerformanceTable', () => {
  it('renders a row per rating with numeric columns', () => {
    const store = cloneSeedData()
    const ratings = [computeActorPerformance(store, 'user-farmer-001'), computeActorPerformance(store, 'user-lab-001')]
    render(<AdminPerformanceTable ratings={ratings} users={store.users} />)
    const table = screen.getByTestId('admin-performance-table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('Alemu Bekele')).toBeInTheDocument()
    expect(screen.getByText('Coffee Quality Lab Addis')).toBeInTheDocument()
  })
})

