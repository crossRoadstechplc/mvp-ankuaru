import type { Role } from '@/lib/domain/types'
import { MOCK_USER_ID_HEADER, MOCK_USER_ROLE_HEADER } from '@/lib/auth/api-guards'

export type MockSessionHeaders = { userId: string; role: Role }

export function mockSessionHeaders(session: MockSessionHeaders): Record<string, string> {
  return {
    [MOCK_USER_ID_HEADER]: session.userId,
    [MOCK_USER_ROLE_HEADER]: session.role,
  }
}

/**
 * Builds a `Request` for invoking Next route handlers in Vitest with optional mock session headers.
 */
export function withProjectRoot(
  projectRoot: string,
  init?: RequestInit,
  session?: MockSessionHeaders,
): Request {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-ankuaru-project-root': projectRoot,
    ...(init?.headers as Record<string, string>),
  }
  if (session) {
    Object.assign(headers, mockSessionHeaders(session))
  }
  return new Request('http://localhost', { ...init, headers })
}
