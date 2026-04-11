'use client'

import { useEffect, useState } from 'react'

import { useSessionStore } from '@/store/session-store'

/** True after zustand persist has finished rehydrating from localStorage (client only). */
export function useSessionHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSessionStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true)
    }
    return unsub
  }, [])

  return hydrated
}
