import { useToastStore } from '@/store/toast-store'

/** Global confirmation / error toasts (mounted via `AppToastHost` in root layout). */
export function showAppToast(message: string, variant: 'success' | 'error' = 'success') {
  useToastStore.getState().push(message, variant)
}
