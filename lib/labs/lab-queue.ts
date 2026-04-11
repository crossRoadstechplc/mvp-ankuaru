import type { LiveDataStore, Lot } from '@/lib/domain/types'

/**
 * Lots awaiting or re-needing lab work (not cleared and not exempt).
 */
export const getLotsInLabQueue = (store: LiveDataStore): Lot[] =>
  store.lots.filter(
    (lot) =>
      lot.labStatus !== 'NOT_REQUIRED' &&
      lot.labStatus !== 'APPROVED' &&
      lot.integrityStatus === 'OK',
  )
