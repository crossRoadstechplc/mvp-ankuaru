import type { Event } from '@/lib/domain/types'

/** Absolute tolerance (kg) for float mass balance checks. */
export const MASS_BALANCE_EPSILON_KG = 1e-6

export type ByproductMasses = {
  pulp: number
  husk: number
  parchment: number
  defects: number
  moistureLoss: number
}

export const sumByproductMasses = (b: ByproductMasses): number =>
  b.pulp + b.husk + b.parchment + b.defects + b.moistureLoss

/**
 * Business rule: input weight equals main output plus every byproduct stream (all in kg).
 */
export const isMassBalanced = (inputWeight: number, outputWeight: number, byproducts: ByproductMasses): boolean => {
  const totalOut = outputWeight + sumByproductMasses(byproducts)
  return Math.abs(inputWeight - totalOut) <= MASS_BALANCE_EPSILON_KG
}

/** Sum masses from a PROCESS event `byproducts` payload (ledger). */
export const sumLedgerByproductsKg = (b: Event['byproducts'] | undefined): number => {
  if (!b) {
    return 0
  }
  return (b.pulp ?? 0) + (b.husk ?? 0) + (b.parchment ?? 0) + (b.defects ?? 0) + (b.moistureLoss ?? 0)
}
