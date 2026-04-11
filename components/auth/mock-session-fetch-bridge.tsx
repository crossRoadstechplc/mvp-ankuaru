'use client'

import { useEffect } from 'react'

import { MOCK_USER_ID_HEADER, MOCK_USER_ROLE_HEADER } from '@/lib/auth/mock-session-constants'
import { useSessionStore } from '@/store/session-store'

const shouldAttachMockSession = (input: RequestInfo | URL): boolean => {
  if (typeof input === 'string') {
    return input.startsWith('/api')
  }
  if (input instanceof URL) {
    return input.pathname.startsWith('/api')
  }
  try {
    return new URL(input.url).pathname.startsWith('/api')
  } catch {
    return false
  }
}

/**
 * Attaches mock session headers to same-origin `/api/*` fetches so route handlers can
 * enforce role checks without trusting body ids.
 */
export function MockSessionFetchBridge() {
  const userId = useSessionStore((s) => s.currentUserId)
  const role = useSessionStore((s) => s.currentUserRole)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const originalFetch = window.fetch.bind(window)

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      )

      if (userId && role && shouldAttachMockSession(input)) {
        headers.set(MOCK_USER_ID_HEADER, userId)
        headers.set(MOCK_USER_ROLE_HEADER, role)
      }

      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(input, { ...init, headers })
      }

      return originalFetch(new Request(input, { ...init, headers }))
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [userId, role])

  return null
}
