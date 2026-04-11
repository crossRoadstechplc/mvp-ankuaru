import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

export function seedAdminSession(): void {
  useSessionStore.setState({
    currentUserId: 'user-admin-001',
    currentUserRole: 'admin',
    currentUserName: 'Platform Admin',
  })
}

export function seedFarmerSession(): void {
  useSessionStore.setState({
    currentUserId: 'user-farmer-001',
    currentUserRole: 'farmer',
    currentUserName: 'Alemu Bekele',
  })
}

export function clearSessionForTest(): void {
  useSessionStore.getState().logout()
}

export function resetUiAndSessionForTest(): void {
  useUiStore.getState().resetUiState()
  useSessionStore.getState().logout()
}
