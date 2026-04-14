import type { Field } from '@/lib/domain/types'

export type FieldDistributionMapProps = {
  fields: Field[]
  /** When set, auto-fit bounds use only this farmer’s fields so the view stays near the signed-in user’s plots. */
  focusFarmerId?: string
  title?: string
}
