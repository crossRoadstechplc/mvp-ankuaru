import type { LiveDataStore, Lot } from '@/lib/domain/types'

/**
 * Lots awaiting or re-needing lab work.
 * Primary signal is physical custody at the lab (`AT_LAB`), with a fallback for legacy pending rows.
 */
export const getLotsInLabQueue = (store: LiveDataStore): Lot[] =>
  store.lots.filter(
    (lot) =>
      (lot.status === 'AT_LAB' || lot.labStatus === 'PENDING') &&
      lot.labStatus !== 'APPROVED' &&
      lot.integrityStatus === 'OK',
  )
