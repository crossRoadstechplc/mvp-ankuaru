import { randomBytes, randomUUID } from 'node:crypto'

/**
 * Opaque public-facing lot identifier — no field names, forms, or sequential business meaning.
 * Format: PLT- + 12 uppercase hex chars (48 bits of randomness).
 */
export const generateOpaquePublicLotCode = (): string => {
  const hex = randomBytes(6).toString('hex').toUpperCase()
  return `PLT-${hex}`
}

/**
 * Opaque trace key for internal correlation (not derived from business labels).
 */
export const generateOpaqueTraceKey = (): string => {
  const hex = randomBytes(5).toString('hex').toUpperCase()
  return `TRK-${hex}`
}

export const generateInternalUuid = (): string => randomUUID()
