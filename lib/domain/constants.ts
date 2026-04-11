import type {
  BankReviewStatus,
  ByproductKind,
  EventType,
  LabStatus,
  LotForm,
  LotStatus,
  LotValidationStatus,
  ProcessingMethod,
  Role,
  TradeStatus,
} from './types'

export const ROLE_VALUES = [
  'farmer',
  'aggregator',
  'processor',
  'transporter',
  'lab',
  'exporter',
  'importer',
  'bank',
  'admin',
  'regulator',
] as const satisfies ReadonlyArray<Role>

export const LOT_FORM_VALUES = [
  'CHERRY',
  'DRIED_CHERRY',
  'PARCHMENT',
  'GREEN',
  'BYPRODUCT',
] as const satisfies ReadonlyArray<LotForm>

export const BYPRODUCT_KIND_VALUES = [
  'pulp',
  'husk',
  'parchment',
  'defects',
  'moistureLoss',
] as const satisfies ReadonlyArray<ByproductKind>

export const PROCESSING_METHOD_VALUES = ['washed', 'natural'] as const satisfies ReadonlyArray<ProcessingMethod>

export const LOT_STATUS_VALUES = [
  'ACTIVE',
  'IN_TRANSIT',
  'IN_PROCESSING',
  'READY_FOR_PROCESSING',
  'AT_LAB',
  'READY_FOR_EXPORT',
  'DELIVERED',
  'QUARANTINED',
  'CLOSED',
] as const satisfies ReadonlyArray<LotStatus>

export const LAB_STATUS_VALUES = [
  'NOT_REQUIRED',
  'PENDING',
  'APPROVED',
  'FAILED',
] as const satisfies ReadonlyArray<LabStatus>

export const LOT_VALIDATION_STATUS_VALUES = [
  'PENDING',
  'VALIDATED',
  'REJECTED',
] as const satisfies ReadonlyArray<LotValidationStatus>

export const TRADE_STATUS_VALUES = [
  'DRAFT',
  'OPEN',
  'BID_SELECTED',
  'BANK_PENDING',
  'BANK_APPROVED',
  'IN_TRANSIT',
  'DELIVERED',
  'SETTLED',
  'MARGIN_CALL',
  'DEFAULTED',
  'LIQUIDATED',
] as const satisfies ReadonlyArray<TradeStatus>

export const BANK_REVIEW_STATUS_VALUES = [
  'PENDING_REVIEW',
  'BACKGROUND_CHECK_IN_PROGRESS',
  'APPROVED',
  'REJECTED',
] as const satisfies ReadonlyArray<BankReviewStatus>

export const EVENT_TYPE_VALUES = [
  'PICK',
  'CREATE_FIELD',
  'AGGREGATE',
  'DISAGGREGATE',
  'PROCESS',
  'TRANSFER_CUSTODY',
  'TRANSFER_OWNERSHIP',
  'DISPATCH',
  'RECEIPT',
  'HANDOVER_TO_LAB',
  'LAB_RESULT',
  'RFQ_CREATED',
  'BID_SUBMITTED',
  'BID_SELECTED',
  'TRADE_CREATED',
  'BANK_APPROVED',
  'DELIVERY_CONFIRMED',
  'SETTLEMENT_COMPLETED',
  'MARGIN_CALL',
  'TRADE_DEFAULTED',
  'COLLATERAL_LIQUIDATED',
  'INTEGRITY_FLAGGED',
  'VALIDATE_LOT',
] as const satisfies ReadonlyArray<EventType>

export const LOT_INTEGRITY_VALUES = [
  'OK',
  'COMPROMISED',
] as const satisfies ReadonlyArray<'OK' | 'COMPROMISED'>

export const RFQ_STATUS_VALUES = [
  'OPEN',
  'CLOSED',
] as const satisfies ReadonlyArray<'OPEN' | 'CLOSED'>

export const BID_STATUS_VALUES = [
  'SUBMITTED',
  'SELECTED',
  'REJECTED',
] as const satisfies ReadonlyArray<'SUBMITTED' | 'SELECTED' | 'REJECTED'>
