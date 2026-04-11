import type { LiveDataStore, Trade } from '@/lib/domain/types'

/** First trade record that references the lot id (demo store has at most one). */
export const getTradeForLot = (store: LiveDataStore, lotId: string): Trade | undefined =>
  store.trades.find((t) => t.lotIds.includes(lotId))
