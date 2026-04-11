'use client'

import { useEffect, useState } from 'react'

import type { InventorySummary } from '@/lib/inventory/inventory-summary'

import { InventoryChartsSection } from './inventory-charts'

/**
 * Defers Recharts until the browser so static generation does not measure a zero-width container.
 */
export function InventoryChartsClientMount({ summary }: { summary: InventorySummary }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(true)
  }, [])

  if (!ready) {
    return <p className="text-sm text-slate-600">Loading charts…</p>
  }

  return <InventoryChartsSection summary={summary} />
}
