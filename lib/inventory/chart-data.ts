import type { InventorySummary } from './inventory-summary'

/** Recharts-friendly rows for inventory by operational stage. */
export type StageChartRow = {
  name: string
  lotCount: number
  weightKg: number
}

/** Loss vs output visualization: main product mass vs byproduct streams vs residual. */
export type LossOutputChartRow = {
  name: string
  valueKg: number
}

export type TradeStatusChartRow = {
  name: string
  count: number
}

export const prepareStageChartData = (summary: InventorySummary): StageChartRow[] =>
  summary.lotsByStage.map((row) => ({
    name: row.label,
    lotCount: row.lotCount,
    weightKg: Math.round(row.totalWeightKg * 100) / 100,
  }))

export const prepareFormChartData = (summary: InventorySummary) =>
  summary.lotsByForm.map((row) => ({
    name: row.form,
    lotCount: row.lotCount,
    weightKg: Math.round(row.totalWeightKg * 100) / 100,
  }))

export const prepareLossVsOutputChartData = (summary: InventorySummary): LossOutputChartRow[] => {
  const { processMass } = summary
  const rows: LossOutputChartRow[] = [
    { name: 'Main output (ledger)', valueKg: Math.round(processMass.totalMainOutputKg * 100) / 100 },
    { name: 'Byproduct streams (ledger)', valueKg: Math.round(processMass.totalByproductStreamKg * 100) / 100 },
  ]
  const residual = Math.abs(processMass.residualKg)
  if (residual > 1e-6) {
    rows.push({ name: 'Unaccounted / residual', valueKg: Math.round(residual * 100) / 100 })
  }
  return rows
}

export const prepareTradeStatusChartData = (summary: InventorySummary): TradeStatusChartRow[] =>
  summary.tradeStatusCounts.map((row) => ({
    name: row.label,
    count: row.count,
  }))
