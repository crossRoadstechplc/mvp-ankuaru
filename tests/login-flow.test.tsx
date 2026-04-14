import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LoginClient } from '@/components/auth/login-client'
import { cloneSeedData } from '@/data/seed-data'
import { getEligibleLoginUsers } from '@/lib/auth/login-eligibility'
import { useSessionStore } from '@/store/session-store'

const mockReplace = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}))

const eligibleFromSeed = () => {
  const store = cloneSeedData()
  return getEligibleLoginUsers(store)
}

describe('LoginClient', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
    mockReplace.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads and renders eligible users from the API grouped by role', async () => {
    const users = eligibleFromSeed()
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url.includes('/api/auth/eligible-users')) {
        return Promise.resolve(new Response(JSON.stringify({ users }), { status: 200 }))
      }
      if (url.includes('/api/bankReviews')) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
    })

    render(<LoginClient />)
    expect(screen.getByTestId('login-loading')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('login-user-list')).toBeInTheDocument()
    })

    expect(screen.getByTestId(`login-as-${users[0].id}`)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/eligible-users', { cache: 'no-store' })
    expect(global.fetch).toHaveBeenCalledWith('/api/bankReviews', { cache: 'no-store' })
  })

  it('login success sets session and navigates home', async () => {
    const users = eligibleFromSeed()
    const target = users.find((u) => u.role === 'farmer')!
    vi.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input)
      if (url.includes('/api/auth/eligible-users')) {
        return Promise.resolve(new Response(JSON.stringify({ users }), { status: 200 }))
      }
      if (url.includes('/api/bankReviews')) {
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 404 }))
    })

    render(<LoginClient />)
    await waitFor(() => expect(screen.getByTestId(`login-as-${target.id}`)).toBeInTheDocument())

    fireEvent.click(screen.getByTestId(`login-as-${target.id}`))

    await waitFor(() => {
      expect(useSessionStore.getState().currentUserId).toBe(target.id)
      expect(useSessionStore.getState().currentUserRole).toBe(target.role)
      expect(useSessionStore.getState().currentUserName).toBe(target.name)
    })
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
