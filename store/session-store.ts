'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Role } from '@/lib/domain/types'

export type SessionSnapshot = {
  currentUserId: string | null
  currentUserRole: Role | null
  currentUserName: string | null
}

type SessionState = SessionSnapshot & {
  setSession: (userId: string, role: Role, displayName: string) => void
  logout: () => void
}

const emptySession = (): SessionSnapshot => ({
  currentUserId: null,
  currentUserRole: null,
  currentUserName: null,
})

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...emptySession(),
      setSession: (userId, role, displayName) =>
        set({
          currentUserId: userId,
          currentUserRole: role,
          currentUserName: displayName,
        }),
      logout: () => set(emptySession()),
    }),
    {
      name: 'ankuaru-mock-session',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }
        }
        return window.localStorage
      }),
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        currentUserRole: state.currentUserRole,
        currentUserName: state.currentUserName,
      }),
    },
  ),
)
