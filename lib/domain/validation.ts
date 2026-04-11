import {
  BANK_REVIEW_STATUS_VALUES,
  BID_STATUS_VALUES,
  BYPRODUCT_KIND_VALUES,
  EVENT_TYPE_VALUES,
  LAB_STATUS_VALUES,
  LOT_FORM_VALUES,
  LOT_INTEGRITY_VALUES,
  LOT_VALIDATION_STATUS_VALUES,
  LOT_STATUS_VALUES,
  RFQ_STATUS_VALUES,
  ROLE_VALUES,
  TRADE_STATUS_VALUES,
} from './constants'
import type { LiveDataStore } from './types'

type UnknownRecord = Record<string, unknown>

const ROOT_KEYS = [
  'users',
  'farmerProfiles',
  'fields',
  'lots',
  'events',
  'rfqs',
  'bids',
  'trades',
  'labResults',
  'bankReviews',
  'vehicles',
  'drivers',
] as const satisfies ReadonlyArray<keyof LiveDataStore>

const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean'
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString)

const isOneOf = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
): value is T => isString(value) && allowedValues.includes(value as T)

const pushIfFalse = (condition: boolean, message: string, errors: string[]): void => {
  if (!condition) {
    errors.push(message)
  }
}

const validatePointArray = (value: unknown, path: string, errors: string[]): void => {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`)
    return
  }

  pushIfFalse(value.length > 0, `${path} must not be empty`, errors)

  value.forEach((point, index) => {
    const itemPath = `${path}[${index}]`
    pushIfFalse(isObject(point), `${itemPath} must be an object`, errors)
    if (!isObject(point)) {
      return
    }

    pushIfFalse(isNumber(point.lat), `${itemPath}.lat must be a number`, errors)
    pushIfFalse(isNumber(point.lng), `${itemPath}.lng must be a number`, errors)
  })
}

const validateOptionalPoint = (value: unknown, path: string, errors: string[]): void => {
  if (value === undefined) {
    return
  }

  pushIfFalse(isObject(value), `${path} must be an object when present`, errors)
  if (!isObject(value)) {
    return
  }

  pushIfFalse(isNumber(value.lat), `${path}.lat must be a number`, errors)
  pushIfFalse(isNumber(value.lng), `${path}.lng must be a number`, errors)
}

const validateOptionalRecord = (value: unknown, path: string, errors: string[]): void => {
  if (value === undefined) {
    return
  }

  pushIfFalse(isObject(value), `${path} must be an object when present`, errors)
}

const validateByproducts = (value: unknown, path: string, errors: string[]): void => {
  if (value === undefined) {
    return
  }

  pushIfFalse(isObject(value), `${path} must be an object when present`, errors)
  if (!isObject(value)) {
    return
  }

  for (const key of ['pulp', 'husk', 'parchment', 'defects', 'moistureLoss'] as const) {
    if (hasOwn(value, key) && value[key] !== undefined) {
      pushIfFalse(isNumber(value[key]), `${path}.${key} must be a number`, errors)
    }
  }
}

const validateCollection = (
  value: unknown,
  path: string,
  errors: string[],
  validateItem: (item: UnknownRecord, itemPath: string, itemErrors: string[]) => void,
): void => {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`)
    return
  }

  value.forEach((entry, index) => {
    const itemPath = `${path}[${index}]`
    pushIfFalse(isObject(entry), `${itemPath} must be an object`, errors)
    if (isObject(entry)) {
      validateItem(entry, itemPath, errors)
    }
  })
}

export const collectLiveDataStoreErrors = (value: unknown): string[] => {
  const errors: string[] = []

  if (!isObject(value)) {
    return ['store must be an object']
  }

  for (const key of ROOT_KEYS) {
    pushIfFalse(hasOwn(value, key), `store.${key} is missing`, errors)
  }

  validateCollection(value.users, 'store.users', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.name), `${path}.name must be a string`, itemErrors)
    if (hasOwn(item, 'email') && item.email !== undefined) {
      pushIfFalse(isString(item.email), `${path}.email must be a string`, itemErrors)
    }
    pushIfFalse(isOneOf(item.role, ROLE_VALUES), `${path}.role is invalid`, itemErrors)
    pushIfFalse(isBoolean(item.isActive), `${path}.isActive must be a boolean`, itemErrors)
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.farmerProfiles, 'store.farmerProfiles', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.userId), `${path}.userId must be a string`, itemErrors)
    pushIfFalse(isString(item.displayName), `${path}.displayName must be a string`, itemErrors)
    if (hasOwn(item, 'phone') && item.phone !== undefined) {
      pushIfFalse(isString(item.phone), `${path}.phone must be a string`, itemErrors)
    }
    if (hasOwn(item, 'region') && item.region !== undefined) {
      pushIfFalse(isString(item.region), `${path}.region must be a string`, itemErrors)
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.fields, 'store.fields', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.farmerId), `${path}.farmerId must be a string`, itemErrors)
    pushIfFalse(isString(item.name), `${path}.name must be a string`, itemErrors)
    validatePointArray(item.polygon, `${path}.polygon`, itemErrors)
    validateOptionalPoint(item.centroid, `${path}.centroid`, itemErrors)
    if (hasOwn(item, 'areaSqm') && item.areaSqm !== undefined) {
      pushIfFalse(isNumber(item.areaSqm), `${path}.areaSqm must be a number`, itemErrors)
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.lots, 'store.lots', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.publicLotCode), `${path}.publicLotCode must be a string`, itemErrors)
    pushIfFalse(isString(item.internalUuid), `${path}.internalUuid must be a string`, itemErrors)
    pushIfFalse(isString(item.traceKey), `${path}.traceKey must be a string`, itemErrors)
    for (const key of ['fieldId', 'farmerId', 'farmId', 'collateralHolderId', 'quarantineReason'] as const) {
      if (hasOwn(item, key) && item[key] !== undefined) {
        pushIfFalse(isString(item[key]), `${path}.${key} must be a string`, itemErrors)
      }
    }
    pushIfFalse(isOneOf(item.form, LOT_FORM_VALUES), `${path}.form is invalid`, itemErrors)
    pushIfFalse(isNumber(item.weight), `${path}.weight must be a number`, itemErrors)
    pushIfFalse(isString(item.ownerId), `${path}.ownerId must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.ownerRole, ROLE_VALUES), `${path}.ownerRole is invalid`, itemErrors)
    pushIfFalse(isString(item.custodianId), `${path}.custodianId must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.custodianRole, ROLE_VALUES), `${path}.custodianRole is invalid`, itemErrors)
    pushIfFalse(isStringArray(item.parentLotIds), `${path}.parentLotIds must be a string[]`, itemErrors)
    pushIfFalse(isStringArray(item.childLotIds), `${path}.childLotIds must be a string[]`, itemErrors)
    pushIfFalse(isOneOf(item.status, LOT_STATUS_VALUES), `${path}.status is invalid`, itemErrors)
    pushIfFalse(isOneOf(item.labStatus, LAB_STATUS_VALUES), `${path}.labStatus is invalid`, itemErrors)
    pushIfFalse(isBoolean(item.isCollateral), `${path}.isCollateral must be a boolean`, itemErrors)
    pushIfFalse(isOneOf(item.integrityStatus, LOT_INTEGRITY_VALUES), `${path}.integrityStatus is invalid`, itemErrors)
    pushIfFalse(isOneOf(item.validationStatus, LOT_VALIDATION_STATUS_VALUES), `${path}.validationStatus is invalid`, itemErrors)
    if (hasOwn(item, 'validatedByUserId') && item.validatedByUserId !== undefined) {
      pushIfFalse(isString(item.validatedByUserId), `${path}.validatedByUserId must be a string`, itemErrors)
    }
    if (hasOwn(item, 'validatedAt') && item.validatedAt !== undefined) {
      pushIfFalse(isString(item.validatedAt), `${path}.validatedAt must be a string`, itemErrors)
    }
    if (hasOwn(item, 'observedWeight') && item.observedWeight !== undefined) {
      pushIfFalse(isNumber(item.observedWeight), `${path}.observedWeight must be a number`, itemErrors)
    }
    if (hasOwn(item, 'validationNotes') && item.validationNotes !== undefined) {
      pushIfFalse(isString(item.validationNotes), `${path}.validationNotes must be a string`, itemErrors)
    }
    if (hasOwn(item, 'byproductKind') && item.byproductKind !== undefined) {
      pushIfFalse(isOneOf(item.byproductKind, BYPRODUCT_KIND_VALUES), `${path}.byproductKind is invalid`, itemErrors)
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.events, 'store.events', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.type, EVENT_TYPE_VALUES), `${path}.type is invalid`, itemErrors)
    pushIfFalse(isString(item.timestamp), `${path}.timestamp must be a string`, itemErrors)
    pushIfFalse(isString(item.actorId), `${path}.actorId must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.actorRole, ROLE_VALUES), `${path}.actorRole is invalid`, itemErrors)
    pushIfFalse(isStringArray(item.inputLotIds), `${path}.inputLotIds must be a string[]`, itemErrors)
    pushIfFalse(isStringArray(item.outputLotIds), `${path}.outputLotIds must be a string[]`, itemErrors)
    if (hasOwn(item, 'inputQty') && item.inputQty !== undefined) {
      pushIfFalse(isNumber(item.inputQty), `${path}.inputQty must be a number`, itemErrors)
    }
    if (hasOwn(item, 'outputQty') && item.outputQty !== undefined) {
      pushIfFalse(isNumber(item.outputQty), `${path}.outputQty must be a number`, itemErrors)
    }
    validateByproducts(item.byproducts, `${path}.byproducts`, itemErrors)
    validateOptionalRecord(item.metadata, `${path}.metadata`, itemErrors)
  })

  validateCollection(value.rfqs, 'store.rfqs', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.createdByUserId), `${path}.createdByUserId must be a string`, itemErrors)
    pushIfFalse(isNumber(item.quantity), `${path}.quantity must be a number`, itemErrors)
    pushIfFalse(isString(item.qualityRequirement), `${path}.qualityRequirement must be a string`, itemErrors)
    pushIfFalse(isString(item.location), `${path}.location must be a string`, itemErrors)
    if (hasOwn(item, 'notes') && item.notes !== undefined) {
      pushIfFalse(isString(item.notes), `${path}.notes must be a string`, itemErrors)
    }
    pushIfFalse(isOneOf(item.status, RFQ_STATUS_VALUES), `${path}.status is invalid`, itemErrors)
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.bids, 'store.bids', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.rfqId), `${path}.rfqId must be a string`, itemErrors)
    pushIfFalse(isString(item.bidderUserId), `${path}.bidderUserId must be a string`, itemErrors)
    pushIfFalse(isNumber(item.price), `${path}.price must be a number`, itemErrors)
    pushIfFalse(isStringArray(item.lotIds), `${path}.lotIds must be a string[]`, itemErrors)
    if (hasOwn(item, 'notes') && item.notes !== undefined) {
      pushIfFalse(isString(item.notes), `${path}.notes must be a string`, itemErrors)
    }
    pushIfFalse(isOneOf(item.status, BID_STATUS_VALUES), `${path}.status is invalid`, itemErrors)
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.trades, 'store.trades', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.rfqId), `${path}.rfqId must be a string`, itemErrors)
    if (hasOwn(item, 'winningBidId') && item.winningBidId !== undefined) {
      pushIfFalse(isString(item.winningBidId), `${path}.winningBidId must be a string`, itemErrors)
    }
    pushIfFalse(isString(item.buyerUserId), `${path}.buyerUserId must be a string`, itemErrors)
    pushIfFalse(isString(item.sellerUserId), `${path}.sellerUserId must be a string`, itemErrors)
    pushIfFalse(isStringArray(item.lotIds), `${path}.lotIds must be a string[]`, itemErrors)
    pushIfFalse(isOneOf(item.status, TRADE_STATUS_VALUES), `${path}.status is invalid`, itemErrors)
    if (hasOwn(item, 'marginPercent') && item.marginPercent !== undefined) {
      pushIfFalse(isNumber(item.marginPercent), `${path}.marginPercent must be a number`, itemErrors)
    }
    pushIfFalse(isBoolean(item.bankApproved), `${path}.bankApproved must be a boolean`, itemErrors)
    if (hasOwn(item, 'financedAmount') && item.financedAmount !== undefined) {
      pushIfFalse(isNumber(item.financedAmount), `${path}.financedAmount must be a number`, itemErrors)
    }
    if (hasOwn(item, 'adjustmentAmount') && item.adjustmentAmount !== undefined) {
      pushIfFalse(isNumber(item.adjustmentAmount), `${path}.adjustmentAmount must be a number`, itemErrors)
    }
    if (hasOwn(item, 'financingNotes') && item.financingNotes !== undefined) {
      pushIfFalse(isString(item.financingNotes), `${path}.financingNotes must be a string`, itemErrors)
    }
    if (hasOwn(item, 'marginLocked') && item.marginLocked !== undefined) {
      pushIfFalse(isBoolean(item.marginLocked), `${path}.marginLocked must be a boolean`, itemErrors)
    }
    if (hasOwn(item, 'simulationSellerPaidByBank') && item.simulationSellerPaidByBank !== undefined) {
      pushIfFalse(
        isBoolean(item.simulationSellerPaidByBank),
        `${path}.simulationSellerPaidByBank must be a boolean`,
        itemErrors,
      )
    }
    if (hasOwn(item, 'simulationBuyerMarginOnlyUpfront') && item.simulationBuyerMarginOnlyUpfront !== undefined) {
      pushIfFalse(
        isBoolean(item.simulationBuyerMarginOnlyUpfront),
        `${path}.simulationBuyerMarginOnlyUpfront must be a boolean`,
        itemErrors,
      )
    }
    if (hasOwn(item, 'deliveredWeightKg') && item.deliveredWeightKg !== undefined) {
      pushIfFalse(isNumber(item.deliveredWeightKg), `${path}.deliveredWeightKg must be a number`, itemErrors)
    }
    if (hasOwn(item, 'deliveredQualityOk') && item.deliveredQualityOk !== undefined) {
      pushIfFalse(isBoolean(item.deliveredQualityOk), `${path}.deliveredQualityOk must be a boolean`, itemErrors)
    }
    if (hasOwn(item, 'deliveryNotes') && item.deliveryNotes !== undefined) {
      pushIfFalse(isString(item.deliveryNotes), `${path}.deliveryNotes must be a string`, itemErrors)
    }
    if (hasOwn(item, 'deliveryConfirmedAt') && item.deliveryConfirmedAt !== undefined) {
      pushIfFalse(isString(item.deliveryConfirmedAt), `${path}.deliveryConfirmedAt must be a string`, itemErrors)
    }
    if (hasOwn(item, 'simulatedPriceIndex') && item.simulatedPriceIndex !== undefined) {
      pushIfFalse(isNumber(item.simulatedPriceIndex), `${path}.simulatedPriceIndex must be a number`, itemErrors)
    }
    if (hasOwn(item, 'bankRepaidSimulator') && item.bankRepaidSimulator !== undefined) {
      pushIfFalse(isBoolean(item.bankRepaidSimulator), `${path}.bankRepaidSimulator must be a boolean`, itemErrors)
    }
    for (const key of ['bankRepaidAt', 'settlementCompletedAt', 'marginCallAt', 'defaultedAt', 'liquidatedAt'] as const) {
      if (hasOwn(item, key) && item[key] !== undefined) {
        pushIfFalse(isString(item[key]), `${path}.${key} must be a string`, itemErrors)
      }
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.labResults, 'store.labResults', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.lotId), `${path}.lotId must be a string`, itemErrors)
    pushIfFalse(isString(item.labUserId), `${path}.labUserId must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.status, LAB_STATUS_VALUES), `${path}.status is invalid`, itemErrors)
    if (hasOwn(item, 'score') && item.score !== undefined) {
      pushIfFalse(isNumber(item.score), `${path}.score must be a number`, itemErrors)
    }
    if (hasOwn(item, 'notes') && item.notes !== undefined) {
      pushIfFalse(isString(item.notes), `${path}.notes must be a string`, itemErrors)
    }
    validateOptionalRecord(item.metadata, `${path}.metadata`, itemErrors)
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.bankReviews, 'store.bankReviews', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.applicantUserId), `${path}.applicantUserId must be a string`, itemErrors)
    pushIfFalse(isString(item.reviewerBankUserId), `${path}.reviewerBankUserId must be a string`, itemErrors)
    pushIfFalse(isOneOf(item.reviewStatus, BANK_REVIEW_STATUS_VALUES), `${path}.reviewStatus is invalid`, itemErrors)
    for (const key of ['financialAssessment', 'backgroundCheckStatus', 'notes', 'approvedAt', 'rejectedAt'] as const) {
      if (hasOwn(item, key) && item[key] !== undefined) {
        pushIfFalse(isString(item[key]), `${path}.${key} must be a string`, itemErrors)
      }
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.vehicles, 'store.vehicles', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.plateNumber), `${path}.plateNumber must be a string`, itemErrors)
    if (hasOwn(item, 'ownerName') && item.ownerName !== undefined) {
      pushIfFalse(isString(item.ownerName), `${path}.ownerName must be a string`, itemErrors)
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  validateCollection(value.drivers, 'store.drivers', errors, (item, path, itemErrors) => {
    pushIfFalse(isString(item.id), `${path}.id must be a string`, itemErrors)
    pushIfFalse(isString(item.name), `${path}.name must be a string`, itemErrors)
    if (hasOwn(item, 'phone') && item.phone !== undefined) {
      pushIfFalse(isString(item.phone), `${path}.phone must be a string`, itemErrors)
    }
    pushIfFalse(isString(item.createdAt), `${path}.createdAt must be a string`, itemErrors)
    pushIfFalse(isString(item.updatedAt), `${path}.updatedAt must be a string`, itemErrors)
  })

  const extraKeys = Object.keys(value).filter(
    (key) => !(ROOT_KEYS as readonly string[]).includes(key),
  )
  if (extraKeys.length > 0) {
    errors.push(`store has unexpected keys: ${extraKeys.join(', ')}`)
  }

  return errors
}

/**
 * Older runtime files (pre lot validation / R3) omit `validationStatus`. Default to VALIDATED so
 * operational lots keep prior behavior; new farmer picks still set PENDING at creation time.
 */
export const migrateLiveDataStoreLotValidation = (value: unknown): unknown => {
  if (!isObject(value)) {
    return value
  }
  const store = value as UnknownRecord
  if (!Array.isArray(store.lots)) {
    return value
  }
  const allowed = LOT_VALIDATION_STATUS_VALUES as readonly string[]
  store.lots = store.lots.map((lot) => {
    if (!isObject(lot)) {
      return lot
    }
    const item = lot as UnknownRecord
    const vs = item.validationStatus
    const missingOrInvalid =
      vs === undefined ||
      vs === null ||
      vs === '' ||
      (typeof vs === 'string' && !allowed.includes(vs))
    if (missingOrInvalid) {
      return { ...item, validationStatus: 'VALIDATED' }
    }
    return item
  })
  return value
}

export const assertLiveDataStoreShape = (value: unknown): asserts value is LiveDataStore => {
  const migrated = migrateLiveDataStoreLotValidation(value)
  const errors = collectLiveDataStoreErrors(migrated)
  if (errors.length > 0) {
    throw new Error(`LiveDataStore validation failed:\n${errors.join('\n')}`)
  }
}

export const parseLiveDataStore = (value: unknown): LiveDataStore => {
  const migrated = migrateLiveDataStoreLotValidation(value)
  const errors = collectLiveDataStoreErrors(migrated)
  if (errors.length > 0) {
    throw new Error(`LiveDataStore validation failed:\n${errors.join('\n')}`)
  }

  return migrated as LiveDataStore
}
