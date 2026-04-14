import { create } from 'zustand'

export type AppToastVariant = 'success' | 'error'

export type AppToast = {
  id: string
  message: string
  variant: AppToastVariant
}

type ToastState = {
  toasts: AppToast[]
  push: (message: string, variant?: AppToastVariant) => string
  dismiss: (id: string) => void
}

let idSeq = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, variant = 'success') => {
    const id = `toast-${++idSeq}-${Date.now()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    const ms = variant === 'error' ? 6500 : 4200
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        get().dismiss(id)
      }, ms)
    }
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
