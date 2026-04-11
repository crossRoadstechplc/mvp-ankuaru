import type { Lot } from '@/lib/domain/types'
import { MasterDataError } from '@/lib/master-data/crud'

/** Blocks processing, transport, and transforms when the lot is quarantined or integrity is not OK. */
export const assertLotOperational = (lot: Lot, context = 'Operation'): void => {
  if (lot.status === 'QUARANTINED') {
    throw new MasterDataError(`${context}: lot ${lot.publicLotCode} is quarantined`, 400, 'lot_quarantined')
  }
  if (lot.integrityStatus !== 'OK') {
    throw new MasterDataError(
      `${context}: lot ${lot.publicLotCode} integrity is compromised`,
      400,
      'integrity_compromised',
    )
  }
}
