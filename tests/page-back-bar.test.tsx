import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockBack = vi.fn()
const mockPush = vi.fn()

const pathnameRef = vi.hoisted(() => ({ current: '/trade/rfqs' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: mockBack, push: mockPush }),
}))

import { PageBackBar } from '@/components/layout/page-back-bar'

describe('PageBackBar', () => {
  beforeEach(() => {
    pathnameRef.current = '/trade/rfqs'
    mockBack.mockClear()
    mockPush.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders Back and section link when not hidden', () => {
    render(<PageBackBar sectionHomeHref="/trade" sectionHomeLabel="Trade hub" />)
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Trade hub' })).toHaveAttribute('href', '/trade')
  })

  it('returns null when hidden', () => {
    const { container } = render(
      <PageBackBar hidden sectionHomeHref="/trade" sectionHomeLabel="Trade hub" />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('returns null on /', () => {
    pathnameRef.current = '/'
    const { container } = render(<PageBackBar sectionHomeHref="/trade" sectionHomeLabel="Trade hub" />)
    expect(container.firstChild).toBeNull()
  })
})
