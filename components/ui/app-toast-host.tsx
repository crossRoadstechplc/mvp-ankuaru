'use client'

import { useToastStore } from '@/store/toast-store'

export function AppToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) {
    return null
  }

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[100] flex max-w-md flex-col gap-2 p-4 sm:p-6"
      data-testid="app-toast-host"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg shadow-black/10 ${
            t.variant === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-950'
              : 'border-emerald-200 bg-emerald-50 text-emerald-950'
          }`}
          role="status"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-full border border-black/10 bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-700 hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
