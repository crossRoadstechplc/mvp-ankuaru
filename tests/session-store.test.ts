import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useSessionStore } from '@/store/session-store'

describe('session store (mock auth)', () => {
  beforeEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
  })

  afterEach(() => {
    localStorage.clear()
    useSessionStore.getState().logout()
  })

  it('setSession stores id, role, and display name', () => {
    useSessionStore.getState().setSession('user-lab-001', 'lab', 'Coffee Quality Lab Addis')
    const s = useSessionStore.getState()
    expect(s.currentUserId).toBe('user-lab-001')
    expect(s.currentUserRole).toBe('lab')
    expect(s.currentUserName).toBe('Coffee Quality Lab Addis')
  })

  it('logout clears the session', () => {
    useSessionStore.getState().setSession('x', 'admin', 'Admin')
    useSessionStore.getState().logout()
    const s = useSessionStore.getState()
    expect(s.currentUserId).toBeNull()
    expect(s.currentUserRole).toBeNull()
    expect(s.currentUserName).toBeNull()
  })

  it('persists session fields to localStorage', () => {
    useSessionStore.getState().setSession('user-farmer-001', 'farmer', 'Alemu Bekele')
    const raw = localStorage.getItem('ankuaru-mock-session')
    expect(raw).toBeTruthy()
    expect(raw).toContain('user-farmer-001')
    expect(raw).toContain('farmer')
  })
})
