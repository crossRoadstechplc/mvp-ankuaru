import type { ByproductKind, LiveDataStore } from '@/lib/domain/types'

export type ByproductInventoryRow = {
  kind: ByproductKind
  label: string
  totalKg: number
  lotCount: number
}

const LABELS: Record<ByproductKind, string> = {
  pulp: 'Pulp',
  husk: 'Husk',
  parchment: 'Parchment',
  defects: 'Defects',
  moistureLoss: 'Moisture loss',
}

export const formatByproductKind = (kind: ByproductKind): string => LABELS[kind]

/**
 * Rolls up BYPRODUCT lots that carry `byproductKind` (parallel inventory classes).
 */
export const summarizeByproductInventory = (store: LiveDataStore): ByproductInventoryRow[] => {
  const map = new Map<ByproductKind, { totalKg: number; lotCount: number }>()

  for (const lot of store.lots) {
    if (lot.form !== 'BYPRODUCT' || !lot.byproductKind) {
      continue
    }
    const prev = map.get(lot.byproductKind) ?? { totalKg: 0, lotCount: 0 }
    prev.totalKg += lot.weight
    prev.lotCount += 1
    map.set(lot.byproductKind, prev)
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, agg]) => ({
      kind,
      label: LABELS[kind],
      totalKg: agg.totalKg,
      lotCount: agg.lotCount,
    }))
}
