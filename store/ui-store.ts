'use client'

import { create } from 'zustand'

import type { Role } from '@/lib/domain/types'

type UiState = {
  selectedRole: Role
  selectedUserId: string | null
  expandedPanels: Record<string, boolean>
  filters: {
    search: string
    status: string
  }
}

type UiActions = {
  setSelectedRole: (role: Role) => void
  setSelectedUserId: (userId: string | null) => void
  togglePanel: (panelId: string) => void
  setFilter: (key: keyof UiState['filters'], value: string) => void
  resetUiState: () => void
}

const createInitialState = (): UiState => ({
  selectedRole: 'admin',
  selectedUserId: 'user-admin-001',
  expandedPanels: {
    overview: false,
    roleContext: false,
  },
  filters: {
    search: '',
    status: '',
  },
})

export const useUiStore = create<UiState & UiActions>((set) => ({
  ...createInitialState(),
  setSelectedRole: (role) => set({ selectedRole: role }),
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),
  togglePanel: (panelId) =>
    set((state) => ({
      expandedPanels: {
        ...state.expandedPanels,
        [panelId]: !state.expandedPanels[panelId],
      },
    })),
  setFilter: (key, value) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value,
      },
    })),
  resetUiState: () => set(createInitialState()),
}))
