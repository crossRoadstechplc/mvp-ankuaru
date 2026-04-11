export type Role =
  | 'farmer'
  | 'aggregator'
  | 'processor'
  | 'transporter'
  | 'lab'
  | 'exporter'
  | 'importer'
  | 'bank'
  | 'admin'
  | 'regulator'

export type LotForm =
  | 'CHERRY'
  | 'DRIED_CHERRY'
  | 'PARCHMENT'
  | 'GREEN'
  | 'BYPRODUCT'

/**
 * When `form` is BYPRODUCT, identifies which material stream this lot represents (parallel inventory class).
 * See `lib/lots/processing-engine.ts` — byproducts are first-class lots plus ledger `Event.byproducts` masses.
 */
export type ByproductKind = 'pulp' | 'husk' | 'parchment' | 'defects' | 'moistureLoss'

export type ProcessingMethod = 'washed' | 'natural'

export type LotStatus =
  | 'ACTIVE'
  | 'IN_TRANSIT'
  | 'IN_PROCESSING'
  /** Handed off from aggregation (or admin) to the wash/processing line. */
  | 'READY_FOR_PROCESSING'
  | 'AT_LAB'
  | 'READY_FOR_EXPORT'
  | 'DELIVERED'
  | 'QUARANTINED'
  | 'CLOSED'

/** Aggregator QC gate for farmer-origin lots before they may be aggregated. */
export type LotValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED'

export type LabStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'APPROVED'
  | 'FAILED'

export type TradeStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'BID_SELECTED'
  | 'BANK_PENDING'
  | 'BANK_APPROVED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'SETTLED'
  | 'MARGIN_CALL'
  | 'DEFAULTED'
  | 'LIQUIDATED'

export type BankReviewStatus =
  | 'PENDING_REVIEW'
  | 'BACKGROUND_CHECK_IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'

export type User = {
  id: string
  name: string
  email?: string
  role: Role
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type FarmerProfile = {
  id: string
  userId: string
  displayName: string
  phone?: string
  region?: string
  createdAt: string
  updatedAt: string
}

export type Field = {
  id: string
  farmerId: string
  name: string
  polygon: Array<{ lat: number; lng: number }>
  centroid?: { lat: number; lng: number }
  areaSqm?: number
  createdAt: string
  updatedAt: string
}

export type Lot = {
  id: string
  publicLotCode: string
  internalUuid: string
  traceKey: string
  fieldId?: string
  farmerId?: string
  farmId?: string
  form: LotForm
  weight: number
  ownerId: string
  ownerRole: Role
  custodianId: string
  custodianRole: Role
  parentLotIds: string[]
  childLotIds: string[]
  status: LotStatus
  labStatus: LabStatus
  isCollateral: boolean
  collateralHolderId?: string
  integrityStatus: 'OK' | 'COMPROMISED'
  quarantineReason?: string
  /** Set for `form: 'BYPRODUCT'` lots created by the processing engine. */
  byproductKind?: ByproductKind
  /** Farmer picks default to PENDING; downstream lots default to VALIDATED. */
  validationStatus: LotValidationStatus
  validatedByUserId?: string
  validatedAt?: string
  /** Weight observed during aggregator validation (may replace snapshot weight when VALIDATED). */
  observedWeight?: number
  validationNotes?: string
  createdAt: string
  updatedAt: string
}

export type EventType =
  | 'PICK'
  | 'CREATE_FIELD'
  | 'AGGREGATE'
  | 'DISAGGREGATE'
  | 'PROCESS'
  | 'TRANSFER_CUSTODY'
  | 'TRANSFER_OWNERSHIP'
  | 'DISPATCH'
  | 'RECEIPT'
  | 'HANDOVER_TO_LAB'
  | 'LAB_RESULT'
  | 'RFQ_CREATED'
  | 'BID_SUBMITTED'
  | 'BID_SELECTED'
  | 'TRADE_CREATED'
  | 'BANK_APPROVED'
  | 'DELIVERY_CONFIRMED'
  | 'SETTLEMENT_COMPLETED'
  | 'MARGIN_CALL'
  | 'TRADE_DEFAULTED'
  | 'COLLATERAL_LIQUIDATED'
  | 'INTEGRITY_FLAGGED'
  | 'VALIDATE_LOT'

export type Event = {
  id: string
  type: EventType
  timestamp: string
  actorId: string
  actorRole: Role
  inputLotIds: string[]
  outputLotIds: string[]
  inputQty?: number
  outputQty?: number
  byproducts?: {
    pulp?: number
    husk?: number
    parchment?: number
    defects?: number
    moistureLoss?: number
  }
  metadata?: Record<string, unknown>
}

export type RFQ = {
  id: string
  createdByUserId: string
  quantity: number
  qualityRequirement: string
  location: string
  notes?: string
  status: 'OPEN' | 'CLOSED'
  createdAt: string
  updatedAt: string
}

export type Bid = {
  id: string
  rfqId: string
  /** Exporter or importer user who submitted this bid (seller side when the bid wins). */
  bidderUserId: string
  price: number
  lotIds: string[]
  notes?: string
  status: 'SUBMITTED' | 'SELECTED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

export type Trade = {
  id: string
  rfqId: string
  winningBidId?: string
  buyerUserId: string
  sellerUserId: string
  lotIds: string[]
  status: TradeStatus
  marginPercent?: number
  bankApproved: boolean
  financedAmount?: number
  adjustmentAmount?: number
  /** Bank financing terms / simulator notes (not legal advice). */
  financingNotes?: string
  /** After bank approval when margin % is recorded — simulated lock. */
  marginLocked?: boolean
  /** Simulator: narrative that the bank pays the seller in full at approval. */
  simulationSellerPaidByBank?: boolean
  /** Simulator: buyer initially posts margin only; remainder financed. */
  simulationBuyerMarginOnlyUpfront?: boolean
  /** Confirmed delivered weight (kg) after buyer/seller acknowledgment. */
  deliveredWeightKg?: number
  /** Quality acceptance at delivery (simulator). */
  deliveredQualityOk?: boolean
  /** Notes at delivery (may include commercial detail — redacted for non-commercial roles). */
  deliveryNotes?: string
  /** ISO timestamp when delivery was confirmed. */
  deliveryConfirmedAt?: string
  /** Simulator: last evaluated market price index (1.0 = par); used for margin pressure. */
  simulatedPriceIndex?: number
  /** Buyer repaid bank facility (simulator). */
  bankRepaidSimulator?: boolean
  bankRepaidAt?: string
  settlementCompletedAt?: string
  marginCallAt?: string
  defaultedAt?: string
  liquidatedAt?: string
  createdAt: string
  updatedAt: string
}

export type LabResult = {
  id: string
  lotId: string
  labUserId: string
  status: LabStatus
  score?: number
  notes?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export type BankReview = {
  id: string
  /** User id of the applicant awaiting bank onboarding / clearance. */
  applicantUserId: string
  /** Bank (or admin acting as reviewer) user id — corresponds to reviewer bank identity in product terms. */
  reviewerBankUserId: string
  reviewStatus: BankReviewStatus
  financialAssessment?: string
  backgroundCheckStatus?: string
  notes?: string
  approvedAt?: string
  rejectedAt?: string
  createdAt: string
  updatedAt: string
}

export type Vehicle = {
  id: string
  plateNumber: string
  ownerName?: string
  createdAt: string
  updatedAt: string
}

export type Driver = {
  id: string
  name: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export type LiveDataStore = {
  users: User[]
  farmerProfiles: FarmerProfile[]
  fields: Field[]
  lots: Lot[]
  events: Event[]
  rfqs: RFQ[]
  bids: Bid[]
  trades: Trade[]
  labResults: LabResult[]
  bankReviews: BankReview[]
  vehicles: Vehicle[]
  drivers: Driver[]
}
