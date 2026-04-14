import type { LiveDataStore } from '@/lib/domain/types'

export type DemoValidationResult = {
  ok: boolean
  errors: string[]
  checks: Record<string, boolean>
}

/**
 * Asserts the canonical seed/demo store exposes each core MVP flow at least once.
 */
export const validateDemoStore = (store: LiveDataStore): DemoValidationResult => {
  const errors: string[] = []
  const checks: Record<string, boolean> = {}

  const farmers = new Set(store.farmerProfiles.map((p) => p.userId))
  checks.multipleFarmers = farmers.size >= 2
  if (!checks.multipleFarmers) {
    errors.push('Expected at least 2 farmer profiles for demo diversity')
  }

  checks.multipleFields = store.fields.length >= 3
  if (!checks.multipleFields) {
    errors.push('Expected at least 3 fields')
  }

  /** Canonical traceability seed is intentionally small (two core lots); user-created lots append at runtime. */
  checks.multipleLots = store.lots.length >= 2
  if (!checks.multipleLots) {
    errors.push('Expected at least 2 lots')
  }

  checks.aggregationPath = store.events.some((e) => e.type === 'AGGREGATE')
  checks.transformationDemo =
    checks.aggregationPath || store.events.some((e) => e.type === 'PROCESS' || e.type === 'DISAGGREGATE')
  if (!checks.transformationDemo) {
    errors.push('Expected at least one PROCESS, AGGREGATE, or DISAGGREGATE event')
  }

  checks.processingPath = store.events.some((e) => e.type === 'PROCESS')
  if (!checks.processingPath) {
    errors.push('Expected at least one PROCESS event')
  }

  checks.labApprovedLot = store.lots.some((l) => l.labStatus === 'APPROVED')
  if (!checks.labApprovedLot) {
    errors.push('Expected at least one lab-approved lot snapshot')
  }

  checks.rfqBidTrade =
    store.rfqs.length >= 1 && store.bids.length >= 1 && store.trades.length >= 1
  if (!checks.rfqBidTrade) {
    errors.push('Expected RFQ, bid, and trade records')
  }

  checks.bankReview = store.bankReviews.length >= 1
  if (!checks.bankReview) {
    errors.push('Expected at least one bank review')
  }

  checks.transportFlow =
    store.events.some((e) => e.type === 'DISPATCH') && store.events.some((e) => e.type === 'RECEIPT')
  if (!checks.transportFlow) {
    errors.push('Expected DISPATCH and RECEIPT events for transport demo')
  }

  return {
    ok: errors.length === 0,
    errors,
    checks,
  }
}
