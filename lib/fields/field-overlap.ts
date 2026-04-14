import type { Field } from '@/lib/domain/types'
import type { LatLngPoint } from '@/lib/fields/geometry'
import { polygonsOverlap } from '@/lib/fields/geometry'

export type FieldOverlapCheck = Pick<Field, 'id' | 'farmerId' | 'name' | 'polygon'>

/**
 * Returns another farmer’s field whose polygon intersects the candidate, if any.
 * Same rules as persisted field writes: same-farmer overlaps are allowed; self is excluded on edit.
 */
export function findOtherFarmerOverlappingField(
  polygon: LatLngPoint[],
  farmerId: string,
  excludeFieldId: string | undefined,
  fields: readonly FieldOverlapCheck[],
): FieldOverlapCheck | undefined {
  return fields.find((existing) => {
    if (excludeFieldId !== undefined && existing.id === excludeFieldId) {
      return false
    }
    if (existing.farmerId === farmerId) {
      return false
    }
    return polygonsOverlap(polygon, existing.polygon)
  })
}

export const otherFarmerOverlapMessage = (other: FieldOverlapCheck): string =>
  `This boundary crosses another farmer’s field (“${other.name}”). Draw outside their plot.`
