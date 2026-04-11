import type { LiveDataStore, LotForm, LotStatus, Trade } from '@/lib/domain/types'
import { LOT_STATUS_VALUES } from '@/lib/domain/constants'
import { sumLedgerByproductsKg } from '@/lib/lots/processing-mass-balance'
/** Operational lots considered “active” for dashboard visibility. */
export const ACTIVE_LOT_STATUSES: readonly LotStatus[] = [
  'ACTIVE',
  'IN_PROCESSING',
  'READY_FOR_PROCESSING',
  'IN_TRANSIT',
  'AT_LAB',
  'READY_FOR_EXPORT',
]

const EPS = 1e-6

export type StageBucket = {
  stage: LotStatus
  label: string
  lotCount: number
  totalWeightKg: number
}

export type FormBucket = {
  form: LotForm
  lotCount: number
  totalWeightKg: number
}

export type ProcessMassRollup = {
  /** Sum of PROCESS `inputQty` where recorded. */
  totalInputKg: number
  /** Sum of PROCESS `outputQty` (main product mass from ledger). */
  totalMainOutputKg: number
  /** Sum of all byproduct stream masses on PROCESS rows. */
  totalByproductStreamKg: number
  /**
   * Mass not explained by main output + byproduct streams (should be ~0 when every process is balanced).
   */
  residualKg: number
}

export type InventorySummary = {
  lotsByStage: StageBucket[]
  lotsByForm: FormBucket[]
  activeLotCount: number
  /** Sum of snapshot weights for non-BYPRODUCT lots. */
  totalMainProductWeightKg: number
  /** Sum of snapshot weights for BYPRODUCT lots. */
  totalByproductLotWeightKg: number
  processMass: ProcessMassRollup
  imbalanceWarnings: string[]
  tradeStatusCounts: { status: Trade['status']; count: number; label: string }[]
}

const STAGE_LABEL: Record<LotStatus, string> = {
  ACTIVE: 'Active',
  IN_TRANSIT: 'In transit',
  IN_PROCESSING: 'In processing',
  READY_FOR_PROCESSING: 'Ready for processing',
  AT_LAB: 'At lab',
  READY_FOR_EXPORT: 'Ready for export',
  DELIVERED: 'Delivered',
  QUARANTINED: 'Quarantined',
  CLOSED: 'Closed',
}

const TRADE_STATUS_LABEL: Record<Trade['status'], string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  BID_SELECTED: 'Bid selected',
  BANK_PENDING: 'Bank pending',
  BANK_APPROVED: 'Bank approved',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  SETTLED: 'Settled',
  MARGIN_CALL: 'Margin call',
  DEFAULTED: 'Defaulted',
  LIQUIDATED: 'Liquidated',
}

/**
 * Aggregates live lot snapshots and ledger PROCESS / trade data for dashboards and imbalance checks.
 */
export const computeInventorySummary = (store: LiveDataStore): InventorySummary => {
  const stageMap = new Map<LotStatus, { lotCount: number; totalWeightKg: number }>()
  for (const s of LOT_STATUS_VALUES) {
    stageMap.set(s, { lotCount: 0, totalWeightKg: 0 })
  }

  const formMap = new Map<LotForm, { lotCount: number; totalWeightKg: number }>()
  const forms: LotForm[] = ['CHERRY', 'DRIED_CHERRY', 'PARCHMENT', 'GREEN', 'BYPRODUCT']
  for (const f of forms) {
    formMap.set(f, { lotCount: 0, totalWeightKg: 0 })
  }

  let activeLotCount = 0
  let totalMainProductWeightKg = 0
  let totalByproductLotWeightKg = 0

  for (const lot of store.lots) {
    const st = stageMap.get(lot.status)
    if (st) {
      st.lotCount += 1
      st.totalWeightKg += lot.weight
    }

    const fm = formMap.get(lot.form)
    if (fm) {
      fm.lotCount += 1
      fm.totalWeightKg += lot.weight
    }

    if (ACTIVE_LOT_STATUSES.includes(lot.status)) {
      activeLotCount += 1
    }

    if (lot.form === 'BYPRODUCT') {
      totalByproductLotWeightKg += lot.weight
    } else {
      totalMainProductWeightKg += lot.weight
    }
  }

  const lotsByStage: StageBucket[] = LOT_STATUS_VALUES.map((stage) => {
    const row = stageMap.get(stage)!
    return {
      stage,
      label: STAGE_LABEL[stage],
      lotCount: row.lotCount,
      totalWeightKg: row.totalWeightKg,
    }
  }).filter((row) => row.lotCount > 0 || row.totalWeightKg > 0)

  const lotsByForm: FormBucket[] = forms.map((form) => {
    const row = formMap.get(form)!
    return {
      form,
      lotCount: row.lotCount,
      totalWeightKg: row.totalWeightKg,
    }
  })

  let totalInputKg = 0
  let totalMainOutputKg = 0
  let totalByproductStreamKg = 0
  const imbalanceWarnings: string[] = []

  for (const event of store.events) {
    if (event.type !== 'PROCESS') {
      continue
    }
    const inputQty = event.inputQty ?? 0
    const outputQty = event.outputQty ?? 0
    const bp = sumLedgerByproductsKg(event.byproducts)
    totalInputKg += inputQty
    totalMainOutputKg += outputQty
    totalByproductStreamKg += bp

    const residual = inputQty - outputQty - bp
    if (Math.abs(residual) > EPS) {
      imbalanceWarnings.push(
        `PROCESS ${event.id}: input ${inputQty} kg does not equal main output (${outputQty} kg) plus byproduct streams (${bp} kg); residual ${residual.toFixed(4)} kg.`,
      )
    }
  }

  const residualKg = totalInputKg - totalMainOutputKg - totalByproductStreamKg
  if (Math.abs(residualKg) > EPS) {
    const msg = `Global PROCESS mass residual: ${residualKg.toFixed(4)} kg (input ${totalInputKg} − main ${totalMainOutputKg} − byproducts ${totalByproductStreamKg}).`
    if (!imbalanceWarnings.includes(msg)) {
      imbalanceWarnings.unshift(msg)
    }
  }

  const tradeStatusMap = new Map<Trade['status'], number>()
  for (const t of store.trades) {
    tradeStatusMap.set(t.status, (tradeStatusMap.get(t.status) ?? 0) + 1)
  }
  const tradeStatusCounts = [...tradeStatusMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => ({
      status,
      count,
      label: TRADE_STATUS_LABEL[status],
    }))

  return {
    lotsByStage,
    lotsByForm,
    activeLotCount,
    totalMainProductWeightKg,
    totalByproductLotWeightKg,
    processMass: {
      totalInputKg,
      totalMainOutputKg,
      totalByproductStreamKg,
      residualKg,
    },
    imbalanceWarnings,
    tradeStatusCounts,
  }
}
