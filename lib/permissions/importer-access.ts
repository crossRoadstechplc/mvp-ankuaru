import type { LiveDataStore } from '@/lib/domain/types'

/** Lots referenced on any trade where the importer is the buyer (authorized downstream trace). */
export const getAuthorizedLotIdsForImporter = (store: LiveDataStore, buyerUserId: string): string[] => {
  const ids = new Set<string>()
  for (const trade of store.trades) {
    if (trade.buyerUserId !== buyerUserId) {
      continue
    }
    for (const lotId of trade.lotIds) {
      ids.add(lotId)
    }
  }
  return [...ids]
}

export const canImporterViewLot = (store: LiveDataStore, lotId: string, buyerUserId: string): boolean =>
  getAuthorizedLotIdsForImporter(store, buyerUserId).includes(lotId)
