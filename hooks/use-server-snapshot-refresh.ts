'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { LIVE_DATA_POLL_MS } from '@/hooks/use-live-data-poll'

type Options = {
  pollMs?: number
  enabled?: boolean
}

/**
 * Periodically and on tab focus re-fetches server components for the current route so lists
 * (RFQs, lots, lab results) stay aligned after mutations in other tabs or earlier steps.
 */
export function useServerSnapshotRefresh(options?: Options) {
  const router = useRouter()
  const pollMs = options?.pollMs ?? LIVE_DATA_POLL_MS
  const enabled = options?.enabled ?? true

  useEffect(() => {
    if (!enabled) {
      return
    }

    const refresh = () => {
      router.refresh()
    }

    const intervalId = window.setInterval(refresh, pollMs)

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    const onFocus = () => {
      refresh()
    }
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, pollMs, router])
}
