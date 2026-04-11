import {
  BANK_REVIEW_STATUS_VALUES,
  BID_STATUS_VALUES,
  LAB_STATUS_VALUES,
  LOT_VALIDATION_STATUS_VALUES,
  LOT_FORM_VALUES,
  LOT_INTEGRITY_VALUES,
  LOT_STATUS_VALUES,
  RFQ_STATUS_VALUES,
  ROLE_VALUES,
  TRADE_STATUS_VALUES,
} from '@/lib/domain/constants'
import type {
  BankReview,
  Bid,
  Driver,
  FarmerProfile,
  Field,
  LabResult,
  LiveDataStore,
  Lot,
  RFQ,
  Role,
  Trade,
  User,
  Vehicle,
} from '@/lib/domain/types'

type UnknownRecord = Record<string, unknown>

const isObject = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const hasOwn = (value: UnknownRecord, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key)

const asRecord = (value: unknown, label: string): UnknownRecord => {
  if (!isObject(value)) {
    throw new Error(`${label} must be an object`)
  }

  return value
}

const asTrimmedString = (
  value: unknown,
  label: string,
  options?: { allowEmpty?: boolean },
): string => {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }

  const nextValue = value.trim()
  if (!options?.allowEmpty && nextValue.length === 0) {
    throw new Error(`${label} must not be empty`)
  }

  return nextValue
}

const asOptionalString = (value: unknown, label: string): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return asTrimmedString(value, label)
}

const asRequiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`)
  }

  return value
}

const asOptionalNumber = (value: unknown, label: string): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return asRequiredNumber(value, label)
}

const asRequiredBoolean = (value: unknown, label: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new Error(`${label} must be a boolean`)
  }

  return value
}

const asOptionalBoolean = (value: unknown, label: string): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined
  }

  return asRequiredBoolean(value, label)
}

const asOneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const nextValue = asTrimmedString(value, label)

  if (!values.includes(nextValue as T)) {
    throw new Error(`${label} must be one of ${values.join(', ')}`)
  }

  return nextValue as T
}

const asOptionalOneOf = <T extends string>(
  value: unknown,
  label: string,
  values: readonly T[],
): T | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return asOneOf(value, label, values)
}

const asStringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`)
  }

  return value.map((entry, index) => asTrimmedString(entry, `${label}[${index}]`))
}

const asPointArray = (value: unknown, label: string): Array<{ lat: number; lng: number }> => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a non-empty array`)
  }

  return value.map((entry, index) => {
    const point = asRecord(entry, `${label}[${index}]`)
    return {
      lat: asRequiredNumber(point.lat, `${label}[${index}].lat`),
      lng: asRequiredNumber(point.lng, `${label}[${index}].lng`),
    }
  })
}

const asPolygonRing = (value: unknown, label: string): Array<{ lat: number; lng: number }> => {
  const points = asPointArray(value, label)
  if (points.length < 3) {
    throw new Error(`${label} must include at least three vertices`)
  }

  return points
}

const asOptionalPoint = (
  value: unknown,
  label: string,
): { lat: number; lng: number } | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const point = asRecord(value, label)
  return {
    lat: asRequiredNumber(point.lat, `${label}.lat`),
    lng: asRequiredNumber(point.lng, `${label}.lng`),
  }
}

const asOptionalRecord = (value: unknown, label: string): Record<string, unknown> | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  return asRecord(value, label)
}

const requireAtLeastOneField = (patch: Record<string, unknown>, label: string): void => {
  if (Object.keys(patch).length === 0) {
    throw new Error(`${label} must include at least one updatable field`)
  }
}

export const parseUserCreateInput = (value: unknown): Omit<User, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'user')
  return {
    name: asTrimmedString(input.name, 'user.name'),
    email: asOptionalString(input.email, 'user.email'),
    role: asOneOf(input.role, 'user.role', ROLE_VALUES),
    isActive: asRequiredBoolean(input.isActive, 'user.isActive'),
  }
}

export const parseUserUpdateInput = (value: unknown): Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'user')
  const patch: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'name')) {
    patch.name = asTrimmedString(input.name, 'user.name')
  }
  if (hasOwn(input, 'email')) {
    patch.email = asOptionalString(input.email, 'user.email')
  }
  if (hasOwn(input, 'role')) {
    patch.role = asOneOf(input.role, 'user.role', ROLE_VALUES)
  }
  if (hasOwn(input, 'isActive')) {
    patch.isActive = asRequiredBoolean(input.isActive, 'user.isActive')
  }

  requireAtLeastOneField(patch, 'user update')
  return patch
}

export const parseFarmerCreateInput = (
  value: unknown,
): Omit<FarmerProfile, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'farmer')
  return {
    userId: asTrimmedString(input.userId, 'farmer.userId'),
    displayName: asTrimmedString(input.displayName, 'farmer.displayName'),
    phone: asOptionalString(input.phone, 'farmer.phone'),
    region: asOptionalString(input.region, 'farmer.region'),
  }
}

export const parseFarmerUpdateInput = (
  value: unknown,
): Partial<Omit<FarmerProfile, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'farmer')
  const patch: Partial<Omit<FarmerProfile, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'userId')) {
    patch.userId = asTrimmedString(input.userId, 'farmer.userId')
  }
  if (hasOwn(input, 'displayName')) {
    patch.displayName = asTrimmedString(input.displayName, 'farmer.displayName')
  }
  if (hasOwn(input, 'phone')) {
    patch.phone = asOptionalString(input.phone, 'farmer.phone')
  }
  if (hasOwn(input, 'region')) {
    patch.region = asOptionalString(input.region, 'farmer.region')
  }

  requireAtLeastOneField(patch, 'farmer update')
  return patch
}

export const parseFieldCreateInput = (value: unknown): Omit<Field, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'field')
  return {
    farmerId: asTrimmedString(input.farmerId, 'field.farmerId'),
    name: asTrimmedString(input.name, 'field.name'),
    polygon: asPolygonRing(input.polygon, 'field.polygon'),
    centroid: asOptionalPoint(input.centroid, 'field.centroid'),
    areaSqm: asOptionalNumber(input.areaSqm, 'field.areaSqm'),
  }
}

export const parseFieldUpdateInput = (
  value: unknown,
): Partial<Omit<Field, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'field')
  const patch: Partial<Omit<Field, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'farmerId')) {
    patch.farmerId = asTrimmedString(input.farmerId, 'field.farmerId')
  }
  if (hasOwn(input, 'name')) {
    patch.name = asTrimmedString(input.name, 'field.name')
  }
  if (hasOwn(input, 'polygon')) {
    patch.polygon = asPolygonRing(input.polygon, 'field.polygon')
  }
  if (hasOwn(input, 'centroid')) {
    patch.centroid = asOptionalPoint(input.centroid, 'field.centroid')
  }
  if (hasOwn(input, 'areaSqm')) {
    patch.areaSqm = asOptionalNumber(input.areaSqm, 'field.areaSqm')
  }

  requireAtLeastOneField(patch, 'field update')
  return patch
}

export const parseLotCreateInput = (value: unknown): Omit<Lot, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'lot')
  return {
    publicLotCode: asTrimmedString(input.publicLotCode, 'lot.publicLotCode'),
    internalUuid: asTrimmedString(input.internalUuid, 'lot.internalUuid'),
    traceKey: asTrimmedString(input.traceKey, 'lot.traceKey'),
    fieldId: asOptionalString(input.fieldId, 'lot.fieldId'),
    farmerId: asOptionalString(input.farmerId, 'lot.farmerId'),
    farmId: asOptionalString(input.farmId, 'lot.farmId'),
    form: asOneOf(input.form, 'lot.form', LOT_FORM_VALUES),
    weight: asRequiredNumber(input.weight, 'lot.weight'),
    ownerId: asTrimmedString(input.ownerId, 'lot.ownerId'),
    ownerRole: asOneOf(input.ownerRole, 'lot.ownerRole', ROLE_VALUES),
    custodianId: asTrimmedString(input.custodianId, 'lot.custodianId'),
    custodianRole: asOneOf(input.custodianRole, 'lot.custodianRole', ROLE_VALUES),
    parentLotIds: asStringArray(input.parentLotIds, 'lot.parentLotIds'),
    childLotIds: asStringArray(input.childLotIds, 'lot.childLotIds'),
    status: asOneOf(input.status, 'lot.status', LOT_STATUS_VALUES),
    labStatus: asOneOf(input.labStatus, 'lot.labStatus', LAB_STATUS_VALUES),
    isCollateral: asRequiredBoolean(input.isCollateral, 'lot.isCollateral'),
    collateralHolderId: asOptionalString(input.collateralHolderId, 'lot.collateralHolderId'),
    integrityStatus: asOneOf(input.integrityStatus, 'lot.integrityStatus', LOT_INTEGRITY_VALUES),
    quarantineReason: asOptionalString(input.quarantineReason, 'lot.quarantineReason'),
    validationStatus: asOneOf(
      hasOwn(input, 'validationStatus') ? input.validationStatus : 'VALIDATED',
      'lot.validationStatus',
      LOT_VALIDATION_STATUS_VALUES,
    ),
    validatedByUserId: hasOwn(input, 'validatedByUserId')
      ? asOptionalString(input.validatedByUserId, 'lot.validatedByUserId')
      : undefined,
    validatedAt: hasOwn(input, 'validatedAt') ? asOptionalString(input.validatedAt, 'lot.validatedAt') : undefined,
    observedWeight: hasOwn(input, 'observedWeight')
      ? asOptionalNumber(input.observedWeight, 'lot.observedWeight')
      : undefined,
    validationNotes: hasOwn(input, 'validationNotes')
      ? asOptionalString(input.validationNotes, 'lot.validationNotes')
      : undefined,
  }
}

export const parseLotUpdateInput = (value: unknown): Partial<Omit<Lot, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'lot')
  const patch: Partial<Omit<Lot, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'publicLotCode')) {
    patch.publicLotCode = asTrimmedString(input.publicLotCode, 'lot.publicLotCode')
  }
  if (hasOwn(input, 'internalUuid')) {
    patch.internalUuid = asTrimmedString(input.internalUuid, 'lot.internalUuid')
  }
  if (hasOwn(input, 'traceKey')) {
    patch.traceKey = asTrimmedString(input.traceKey, 'lot.traceKey')
  }
  if (hasOwn(input, 'fieldId')) {
    patch.fieldId = asOptionalString(input.fieldId, 'lot.fieldId')
  }
  if (hasOwn(input, 'farmerId')) {
    patch.farmerId = asOptionalString(input.farmerId, 'lot.farmerId')
  }
  if (hasOwn(input, 'farmId')) {
    patch.farmId = asOptionalString(input.farmId, 'lot.farmId')
  }
  if (hasOwn(input, 'form')) {
    patch.form = asOneOf(input.form, 'lot.form', LOT_FORM_VALUES)
  }
  if (hasOwn(input, 'weight')) {
    patch.weight = asRequiredNumber(input.weight, 'lot.weight')
  }
  if (hasOwn(input, 'ownerId')) {
    patch.ownerId = asTrimmedString(input.ownerId, 'lot.ownerId')
  }
  if (hasOwn(input, 'ownerRole')) {
    patch.ownerRole = asOneOf(input.ownerRole, 'lot.ownerRole', ROLE_VALUES)
  }
  if (hasOwn(input, 'custodianId')) {
    patch.custodianId = asTrimmedString(input.custodianId, 'lot.custodianId')
  }
  if (hasOwn(input, 'custodianRole')) {
    patch.custodianRole = asOneOf(input.custodianRole, 'lot.custodianRole', ROLE_VALUES)
  }
  if (hasOwn(input, 'parentLotIds')) {
    patch.parentLotIds = asStringArray(input.parentLotIds, 'lot.parentLotIds')
  }
  if (hasOwn(input, 'childLotIds')) {
    patch.childLotIds = asStringArray(input.childLotIds, 'lot.childLotIds')
  }
  if (hasOwn(input, 'status')) {
    patch.status = asOneOf(input.status, 'lot.status', LOT_STATUS_VALUES)
  }
  if (hasOwn(input, 'labStatus')) {
    patch.labStatus = asOneOf(input.labStatus, 'lot.labStatus', LAB_STATUS_VALUES)
  }
  if (hasOwn(input, 'isCollateral')) {
    patch.isCollateral = asRequiredBoolean(input.isCollateral, 'lot.isCollateral')
  }
  if (hasOwn(input, 'collateralHolderId')) {
    patch.collateralHolderId = asOptionalString(input.collateralHolderId, 'lot.collateralHolderId')
  }
  if (hasOwn(input, 'integrityStatus')) {
    patch.integrityStatus = asOneOf(input.integrityStatus, 'lot.integrityStatus', LOT_INTEGRITY_VALUES)
  }
  if (hasOwn(input, 'quarantineReason')) {
    patch.quarantineReason = asOptionalString(input.quarantineReason, 'lot.quarantineReason')
  }
  if (hasOwn(input, 'validationStatus')) {
    patch.validationStatus = asOneOf(input.validationStatus, 'lot.validationStatus', LOT_VALIDATION_STATUS_VALUES)
  }
  if (hasOwn(input, 'validatedByUserId')) {
    patch.validatedByUserId = asOptionalString(input.validatedByUserId, 'lot.validatedByUserId')
  }
  if (hasOwn(input, 'validatedAt')) {
    patch.validatedAt = asOptionalString(input.validatedAt, 'lot.validatedAt')
  }
  if (hasOwn(input, 'observedWeight')) {
    patch.observedWeight = asOptionalNumber(input.observedWeight, 'lot.observedWeight')
  }
  if (hasOwn(input, 'validationNotes')) {
    patch.validationNotes = asOptionalString(input.validationNotes, 'lot.validationNotes')
  }

  requireAtLeastOneField(patch, 'lot update')
  return patch
}

export const parseRfqCreateInput = (value: unknown): Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'rfq')
  return {
    createdByUserId: asTrimmedString(input.createdByUserId, 'rfq.createdByUserId'),
    quantity: asRequiredNumber(input.quantity, 'rfq.quantity'),
    qualityRequirement: asTrimmedString(input.qualityRequirement, 'rfq.qualityRequirement'),
    location: asTrimmedString(input.location, 'rfq.location'),
    notes: asOptionalString(input.notes, 'rfq.notes'),
    status: asOneOf(input.status ?? 'OPEN', 'rfq.status', RFQ_STATUS_VALUES),
  }
}

export const parseRfqUpdateInput = (value: unknown): Partial<Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'rfq')
  const patch: Partial<Omit<RFQ, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'createdByUserId')) {
    patch.createdByUserId = asTrimmedString(input.createdByUserId, 'rfq.createdByUserId')
  }
  if (hasOwn(input, 'quantity')) {
    patch.quantity = asRequiredNumber(input.quantity, 'rfq.quantity')
  }
  if (hasOwn(input, 'qualityRequirement')) {
    patch.qualityRequirement = asTrimmedString(input.qualityRequirement, 'rfq.qualityRequirement')
  }
  if (hasOwn(input, 'location')) {
    patch.location = asTrimmedString(input.location, 'rfq.location')
  }
  if (hasOwn(input, 'notes')) {
    patch.notes = asOptionalString(input.notes, 'rfq.notes')
  }
  if (hasOwn(input, 'status')) {
    patch.status = asOneOf(input.status, 'rfq.status', RFQ_STATUS_VALUES)
  }

  requireAtLeastOneField(patch, 'rfq update')
  return patch
}

export const parseBidCreateInput = (value: unknown): Omit<Bid, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'bid')
  return {
    rfqId: asTrimmedString(input.rfqId, 'bid.rfqId'),
    bidderUserId: asTrimmedString(input.bidderUserId, 'bid.bidderUserId'),
    price: asRequiredNumber(input.price, 'bid.price'),
    lotIds: asStringArray(input.lotIds, 'bid.lotIds'),
    notes: asOptionalString(input.notes, 'bid.notes'),
    status: asOneOf(input.status ?? 'SUBMITTED', 'bid.status', BID_STATUS_VALUES),
  }
}

export const parseBidUpdateInput = (value: unknown): Partial<Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'bid')
  const patch: Partial<Omit<Bid, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'rfqId')) {
    patch.rfqId = asTrimmedString(input.rfqId, 'bid.rfqId')
  }
  if (hasOwn(input, 'bidderUserId')) {
    patch.bidderUserId = asTrimmedString(input.bidderUserId, 'bid.bidderUserId')
  }
  if (hasOwn(input, 'price')) {
    patch.price = asRequiredNumber(input.price, 'bid.price')
  }
  if (hasOwn(input, 'lotIds')) {
    patch.lotIds = asStringArray(input.lotIds, 'bid.lotIds')
  }
  if (hasOwn(input, 'notes')) {
    patch.notes = asOptionalString(input.notes, 'bid.notes')
  }
  if (hasOwn(input, 'status')) {
    patch.status = asOneOf(input.status, 'bid.status', BID_STATUS_VALUES)
  }

  requireAtLeastOneField(patch, 'bid update')
  return patch
}

export const parseTradeCreateInput = (value: unknown): Omit<Trade, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'trade')
  return {
    rfqId: asTrimmedString(input.rfqId, 'trade.rfqId'),
    winningBidId: asOptionalString(input.winningBidId, 'trade.winningBidId'),
    buyerUserId: asTrimmedString(input.buyerUserId, 'trade.buyerUserId'),
    sellerUserId: asTrimmedString(input.sellerUserId, 'trade.sellerUserId'),
    lotIds: asStringArray(input.lotIds, 'trade.lotIds'),
    status: asOneOf(input.status, 'trade.status', TRADE_STATUS_VALUES),
    marginPercent: asOptionalNumber(input.marginPercent, 'trade.marginPercent'),
    bankApproved: asRequiredBoolean(input.bankApproved, 'trade.bankApproved'),
    financedAmount: asOptionalNumber(input.financedAmount, 'trade.financedAmount'),
    adjustmentAmount: asOptionalNumber(input.adjustmentAmount, 'trade.adjustmentAmount'),
    financingNotes: asOptionalString(input.financingNotes, 'trade.financingNotes'),
    marginLocked: asOptionalBoolean(input.marginLocked, 'trade.marginLocked'),
    simulationSellerPaidByBank: asOptionalBoolean(input.simulationSellerPaidByBank, 'trade.simulationSellerPaidByBank'),
    simulationBuyerMarginOnlyUpfront: asOptionalBoolean(
      input.simulationBuyerMarginOnlyUpfront,
      'trade.simulationBuyerMarginOnlyUpfront',
    ),
    deliveredWeightKg: asOptionalNumber(input.deliveredWeightKg, 'trade.deliveredWeightKg'),
    deliveredQualityOk: asOptionalBoolean(input.deliveredQualityOk, 'trade.deliveredQualityOk'),
    deliveryNotes: asOptionalString(input.deliveryNotes, 'trade.deliveryNotes'),
    deliveryConfirmedAt: asOptionalString(input.deliveryConfirmedAt, 'trade.deliveryConfirmedAt'),
    simulatedPriceIndex: asOptionalNumber(input.simulatedPriceIndex, 'trade.simulatedPriceIndex'),
    bankRepaidSimulator: asOptionalBoolean(input.bankRepaidSimulator, 'trade.bankRepaidSimulator'),
    bankRepaidAt: asOptionalString(input.bankRepaidAt, 'trade.bankRepaidAt'),
    settlementCompletedAt: asOptionalString(input.settlementCompletedAt, 'trade.settlementCompletedAt'),
    marginCallAt: asOptionalString(input.marginCallAt, 'trade.marginCallAt'),
    defaultedAt: asOptionalString(input.defaultedAt, 'trade.defaultedAt'),
    liquidatedAt: asOptionalString(input.liquidatedAt, 'trade.liquidatedAt'),
  }
}

export const parseTradeUpdateInput = (value: unknown): Partial<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'trade')
  const patch: Partial<Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'rfqId')) {
    patch.rfqId = asTrimmedString(input.rfqId, 'trade.rfqId')
  }
  if (hasOwn(input, 'winningBidId')) {
    patch.winningBidId = asOptionalString(input.winningBidId, 'trade.winningBidId')
  }
  if (hasOwn(input, 'buyerUserId')) {
    patch.buyerUserId = asTrimmedString(input.buyerUserId, 'trade.buyerUserId')
  }
  if (hasOwn(input, 'sellerUserId')) {
    patch.sellerUserId = asTrimmedString(input.sellerUserId, 'trade.sellerUserId')
  }
  if (hasOwn(input, 'lotIds')) {
    patch.lotIds = asStringArray(input.lotIds, 'trade.lotIds')
  }
  if (hasOwn(input, 'status')) {
    patch.status = asOneOf(input.status, 'trade.status', TRADE_STATUS_VALUES)
  }
  if (hasOwn(input, 'marginPercent')) {
    patch.marginPercent = asOptionalNumber(input.marginPercent, 'trade.marginPercent')
  }
  if (hasOwn(input, 'bankApproved')) {
    patch.bankApproved = asRequiredBoolean(input.bankApproved, 'trade.bankApproved')
  }
  if (hasOwn(input, 'financedAmount')) {
    patch.financedAmount = asOptionalNumber(input.financedAmount, 'trade.financedAmount')
  }
  if (hasOwn(input, 'adjustmentAmount')) {
    patch.adjustmentAmount = asOptionalNumber(input.adjustmentAmount, 'trade.adjustmentAmount')
  }
  if (hasOwn(input, 'financingNotes')) {
    patch.financingNotes = asOptionalString(input.financingNotes, 'trade.financingNotes')
  }
  if (hasOwn(input, 'marginLocked')) {
    patch.marginLocked = asOptionalBoolean(input.marginLocked, 'trade.marginLocked')
  }
  if (hasOwn(input, 'simulationSellerPaidByBank')) {
    patch.simulationSellerPaidByBank = asOptionalBoolean(
      input.simulationSellerPaidByBank,
      'trade.simulationSellerPaidByBank',
    )
  }
  if (hasOwn(input, 'simulationBuyerMarginOnlyUpfront')) {
    patch.simulationBuyerMarginOnlyUpfront = asOptionalBoolean(
      input.simulationBuyerMarginOnlyUpfront,
      'trade.simulationBuyerMarginOnlyUpfront',
    )
  }
  if (hasOwn(input, 'deliveredWeightKg')) {
    patch.deliveredWeightKg = asOptionalNumber(input.deliveredWeightKg, 'trade.deliveredWeightKg')
  }
  if (hasOwn(input, 'deliveredQualityOk')) {
    patch.deliveredQualityOk = asOptionalBoolean(input.deliveredQualityOk, 'trade.deliveredQualityOk')
  }
  if (hasOwn(input, 'deliveryNotes')) {
    patch.deliveryNotes = asOptionalString(input.deliveryNotes, 'trade.deliveryNotes')
  }
  if (hasOwn(input, 'deliveryConfirmedAt')) {
    patch.deliveryConfirmedAt = asOptionalString(input.deliveryConfirmedAt, 'trade.deliveryConfirmedAt')
  }
  if (hasOwn(input, 'simulatedPriceIndex')) {
    patch.simulatedPriceIndex = asOptionalNumber(input.simulatedPriceIndex, 'trade.simulatedPriceIndex')
  }
  if (hasOwn(input, 'bankRepaidSimulator')) {
    patch.bankRepaidSimulator = asOptionalBoolean(input.bankRepaidSimulator, 'trade.bankRepaidSimulator')
  }
  if (hasOwn(input, 'bankRepaidAt')) {
    patch.bankRepaidAt = asOptionalString(input.bankRepaidAt, 'trade.bankRepaidAt')
  }
  if (hasOwn(input, 'settlementCompletedAt')) {
    patch.settlementCompletedAt = asOptionalString(input.settlementCompletedAt, 'trade.settlementCompletedAt')
  }
  if (hasOwn(input, 'marginCallAt')) {
    patch.marginCallAt = asOptionalString(input.marginCallAt, 'trade.marginCallAt')
  }
  if (hasOwn(input, 'defaultedAt')) {
    patch.defaultedAt = asOptionalString(input.defaultedAt, 'trade.defaultedAt')
  }
  if (hasOwn(input, 'liquidatedAt')) {
    patch.liquidatedAt = asOptionalString(input.liquidatedAt, 'trade.liquidatedAt')
  }

  requireAtLeastOneField(patch, 'trade update')
  return patch
}

export const parseLabResultCreateInput = (
  value: unknown,
): Omit<LabResult, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'labResult')
  return {
    lotId: asTrimmedString(input.lotId, 'labResult.lotId'),
    labUserId: asTrimmedString(input.labUserId, 'labResult.labUserId'),
    status: asOneOf(input.status, 'labResult.status', LAB_STATUS_VALUES),
    score: asOptionalNumber(input.score, 'labResult.score'),
    notes: asOptionalString(input.notes, 'labResult.notes'),
    metadata: asOptionalRecord(input.metadata, 'labResult.metadata'),
  }
}

export const parseLabResultUpdateInput = (
  value: unknown,
): Partial<Omit<LabResult, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'labResult')
  const patch: Partial<Omit<LabResult, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'lotId')) {
    patch.lotId = asTrimmedString(input.lotId, 'labResult.lotId')
  }
  if (hasOwn(input, 'labUserId')) {
    patch.labUserId = asTrimmedString(input.labUserId, 'labResult.labUserId')
  }
  if (hasOwn(input, 'status')) {
    patch.status = asOneOf(input.status, 'labResult.status', LAB_STATUS_VALUES)
  }
  if (hasOwn(input, 'score')) {
    patch.score = asOptionalNumber(input.score, 'labResult.score')
  }
  if (hasOwn(input, 'notes')) {
    patch.notes = asOptionalString(input.notes, 'labResult.notes')
  }
  if (hasOwn(input, 'metadata')) {
    patch.metadata = asOptionalRecord(input.metadata, 'labResult.metadata')
  }

  requireAtLeastOneField(patch, 'lab result update')
  return patch
}

export const parseBankReviewCreateInput = (
  value: unknown,
): Omit<BankReview, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'bankReview')
  return {
    applicantUserId: asTrimmedString(input.applicantUserId, 'bankReview.applicantUserId'),
    reviewerBankUserId: asTrimmedString(input.reviewerBankUserId, 'bankReview.reviewerBankUserId'),
    reviewStatus: asOneOf(input.reviewStatus, 'bankReview.reviewStatus', BANK_REVIEW_STATUS_VALUES),
    financialAssessment: asOptionalString(input.financialAssessment, 'bankReview.financialAssessment'),
    backgroundCheckStatus: asOptionalString(
      input.backgroundCheckStatus,
      'bankReview.backgroundCheckStatus',
    ),
    notes: asOptionalString(input.notes, 'bankReview.notes'),
    approvedAt: asOptionalString(input.approvedAt, 'bankReview.approvedAt'),
    rejectedAt: asOptionalString(input.rejectedAt, 'bankReview.rejectedAt'),
  }
}

export const parseBankReviewUpdateInput = (
  value: unknown,
): Partial<Omit<BankReview, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'bankReview')
  const patch: Partial<Omit<BankReview, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'applicantUserId')) {
    patch.applicantUserId = asTrimmedString(input.applicantUserId, 'bankReview.applicantUserId')
  }
  if (hasOwn(input, 'reviewerBankUserId')) {
    patch.reviewerBankUserId = asTrimmedString(
      input.reviewerBankUserId,
      'bankReview.reviewerBankUserId',
    )
  }
  if (hasOwn(input, 'reviewStatus')) {
    patch.reviewStatus = asOneOf(
      input.reviewStatus,
      'bankReview.reviewStatus',
      BANK_REVIEW_STATUS_VALUES,
    )
  }
  if (hasOwn(input, 'financialAssessment')) {
    patch.financialAssessment = asOptionalString(
      input.financialAssessment,
      'bankReview.financialAssessment',
    )
  }
  if (hasOwn(input, 'backgroundCheckStatus')) {
    patch.backgroundCheckStatus = asOptionalString(
      input.backgroundCheckStatus,
      'bankReview.backgroundCheckStatus',
    )
  }
  if (hasOwn(input, 'notes')) {
    patch.notes = asOptionalString(input.notes, 'bankReview.notes')
  }
  if (hasOwn(input, 'approvedAt')) {
    patch.approvedAt = asOptionalString(input.approvedAt, 'bankReview.approvedAt')
  }
  if (hasOwn(input, 'rejectedAt')) {
    patch.rejectedAt = asOptionalString(input.rejectedAt, 'bankReview.rejectedAt')
  }

  requireAtLeastOneField(patch, 'bank review update')
  return patch
}

export const parseVehicleCreateInput = (
  value: unknown,
): Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'vehicle')
  return {
    plateNumber: asTrimmedString(input.plateNumber, 'vehicle.plateNumber'),
    ownerName: asOptionalString(input.ownerName, 'vehicle.ownerName'),
  }
}

export const parseVehicleUpdateInput = (
  value: unknown,
): Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'vehicle')
  const patch: Partial<Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'plateNumber')) {
    patch.plateNumber = asTrimmedString(input.plateNumber, 'vehicle.plateNumber')
  }
  if (hasOwn(input, 'ownerName')) {
    patch.ownerName = asOptionalString(input.ownerName, 'vehicle.ownerName')
  }

  requireAtLeastOneField(patch, 'vehicle update')
  return patch
}

export const parseDriverCreateInput = (
  value: unknown,
): Omit<Driver, 'id' | 'createdAt' | 'updatedAt'> => {
  const input = asRecord(value, 'driver')
  return {
    name: asTrimmedString(input.name, 'driver.name'),
    phone: asOptionalString(input.phone, 'driver.phone'),
  }
}

export const parseDriverUpdateInput = (
  value: unknown,
): Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>> => {
  const input = asRecord(value, 'driver')
  const patch: Partial<Omit<Driver, 'id' | 'createdAt' | 'updatedAt'>> = {}

  if (hasOwn(input, 'name')) {
    patch.name = asTrimmedString(input.name, 'driver.name')
  }
  if (hasOwn(input, 'phone')) {
    patch.phone = asOptionalString(input.phone, 'driver.phone')
  }

  requireAtLeastOneField(patch, 'driver update')
  return patch
}

export type MasterCollectionName =
  | 'users'
  | 'farmers'
  | 'fields'
  | 'lots'
  | 'rfqs'
  | 'bids'
  | 'trades'
  | 'labResults'
  | 'bankReviews'
  | 'vehicles'
  | 'drivers'

export type MasterEntityMap = {
  users: User
  farmers: FarmerProfile
  fields: Field
  lots: Lot
  rfqs: RFQ
  bids: Bid
  trades: Trade
  labResults: LabResult
  bankReviews: BankReview
  vehicles: Vehicle
  drivers: Driver
}

export type MasterStoreKeyMap = {
  users: 'users'
  farmers: 'farmerProfiles'
  fields: 'fields'
  lots: 'lots'
  rfqs: 'rfqs'
  bids: 'bids'
  trades: 'trades'
  labResults: 'labResults'
  bankReviews: 'bankReviews'
  vehicles: 'vehicles'
  drivers: 'drivers'
}

export type MasterCollectionSpec<Name extends MasterCollectionName = MasterCollectionName> = {
  apiName: Name
  storeKey: MasterStoreKeyMap[Name]
  label: string
  idPrefix: string
  parseCreate: (value: unknown) => Omit<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'>
  parseUpdate: (value: unknown) => Partial<Omit<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'>>
  findDuplicateError?: (
    candidate: Omit<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'>>,
    collection: MasterEntityMap[Name][],
    existingId?: string,
  ) => string | undefined
}

const duplicateByStringField = <T extends { id: string }>(
  collection: T[],
  field: keyof T & string,
  label: string,
  value: unknown,
  existingId?: string,
): string | undefined => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }

  const duplicate = collection.find(
    (entry) => entry[field] === value && (existingId === undefined || entry.id !== existingId),
  )

  return duplicate ? `${label} must be unique` : undefined
}

export const MASTER_COLLECTION_SPECS: {
  [Name in MasterCollectionName]: MasterCollectionSpec<Name>
} = {
  users: {
    apiName: 'users',
    storeKey: 'users',
    label: 'Users',
    idPrefix: 'user',
    parseCreate: parseUserCreateInput,
    parseUpdate: parseUserUpdateInput,
    findDuplicateError: (candidate, collection, existingId) =>
      duplicateByStringField(collection, 'email', 'user.email', candidate.email, existingId),
  },
  farmers: {
    apiName: 'farmers',
    storeKey: 'farmerProfiles',
    label: 'Farmers',
    idPrefix: 'farmer-profile',
    parseCreate: parseFarmerCreateInput,
    parseUpdate: parseFarmerUpdateInput,
    findDuplicateError: (candidate, collection, existingId) =>
      duplicateByStringField(collection, 'userId', 'farmer.userId', candidate.userId, existingId),
  },
  fields: {
    apiName: 'fields',
    storeKey: 'fields',
    label: 'Fields',
    idPrefix: 'field',
    parseCreate: parseFieldCreateInput,
    parseUpdate: parseFieldUpdateInput,
  },
  lots: {
    apiName: 'lots',
    storeKey: 'lots',
    label: 'Lots',
    idPrefix: 'lot',
    parseCreate: parseLotCreateInput,
    parseUpdate: parseLotUpdateInput,
    findDuplicateError: (candidate, collection, existingId) =>
      duplicateByStringField(collection, 'publicLotCode', 'lot.publicLotCode', candidate.publicLotCode, existingId) ??
      duplicateByStringField(collection, 'internalUuid', 'lot.internalUuid', candidate.internalUuid, existingId) ??
      duplicateByStringField(collection, 'traceKey', 'lot.traceKey', candidate.traceKey, existingId),
  },
  rfqs: {
    apiName: 'rfqs',
    storeKey: 'rfqs',
    label: 'RFQs',
    idPrefix: 'rfq',
    parseCreate: parseRfqCreateInput,
    parseUpdate: parseRfqUpdateInput,
  },
  bids: {
    apiName: 'bids',
    storeKey: 'bids',
    label: 'Bids',
    idPrefix: 'bid',
    parseCreate: parseBidCreateInput,
    parseUpdate: parseBidUpdateInput,
  },
  trades: {
    apiName: 'trades',
    storeKey: 'trades',
    label: 'Trades',
    idPrefix: 'trade',
    parseCreate: parseTradeCreateInput,
    parseUpdate: parseTradeUpdateInput,
  },
  labResults: {
    apiName: 'labResults',
    storeKey: 'labResults',
    label: 'Lab Results',
    idPrefix: 'lab-result',
    parseCreate: parseLabResultCreateInput,
    parseUpdate: parseLabResultUpdateInput,
  },
  bankReviews: {
    apiName: 'bankReviews',
    storeKey: 'bankReviews',
    label: 'Bank Reviews',
    idPrefix: 'bank-review',
    parseCreate: parseBankReviewCreateInput,
    parseUpdate: parseBankReviewUpdateInput,
  },
  vehicles: {
    apiName: 'vehicles',
    storeKey: 'vehicles',
    label: 'Vehicles',
    idPrefix: 'vehicle',
    parseCreate: parseVehicleCreateInput,
    parseUpdate: parseVehicleUpdateInput,
    findDuplicateError: (candidate, collection, existingId) =>
      duplicateByStringField(
        collection,
        'plateNumber',
        'vehicle.plateNumber',
        candidate.plateNumber,
        existingId,
      ),
  },
  drivers: {
    apiName: 'drivers',
    storeKey: 'drivers',
    label: 'Drivers',
    idPrefix: 'driver',
    parseCreate: parseDriverCreateInput,
    parseUpdate: parseDriverUpdateInput,
  },
}

export type MasterCollectionEntry<Name extends MasterCollectionName> = LiveDataStore[MasterStoreKeyMap[Name]][number]
