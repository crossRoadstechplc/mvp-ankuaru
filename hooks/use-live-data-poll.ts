'use client'

import { useEffect } from 'react'

import { useLiveDataClientStore } from '@/store/live-data-client-store'

/** Default interval for keeping aggregator-style views aligned with the JSON live store. */
export const LIVE_DATA_POLL_MS = 8_000

type PollScope = 'lots' | 'all'

type UseLiveDataPollOptions = {
  pollMs?: number
  enabled?: boolean
}

/**
 * Refetches live data on mount, on an interval, and when the tab becomes visible or the window
 * regains focus — so lots created elsewhere (other role, other tab) show up without a full reload.
 */
export function useLiveDataPoll(scope: PollScope, options?: UseLiveDataPollOptions) {
  const pollMs = options?.pollMs ?? LIVE_DATA_POLL_MS
  const enabled = options?.enabled ?? true
  const loadLots = useLiveDataClientStore((s) => s.loadLots)
  const loadAll = useLiveDataClientStore((s) => s.loadAll)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const refresh = () => {
      if (scope === 'all') {
        void loadAll({ force: true })
      } else {
        void loadLots({ force: true })
      }
    }

    refresh()

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
  }, [enabled, loadAll, loadLots, pollMs, scope])
}
