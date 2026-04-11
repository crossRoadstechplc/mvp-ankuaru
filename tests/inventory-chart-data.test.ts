// @vitest-environment node

import { describe, expect, it } from 'vitest'

import {
  prepareFormChartData,
  prepareLossVsOutputChartData,
  prepareStageChartData,
  prepareTradeStatusChartData,
} from '@/lib/inventory/chart-data'
import { computeInventorySummary } from '@/lib/inventory/inventory-summary'
import { cloneSeedData } from '@/data/seed-data'

describe('chart data preparation', () => {
  it('prepareStageChartData maps labels and rounds weights', () => {
    const summary = computeInventorySummary(cloneSeedData())
    const rows = prepareStageChartData(summary)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0]).toHaveProperty('name')
    expect(rows[0]).toHaveProperty('weightKg')
    expect(rows[0]).toHaveProperty('lotCount')
  })

  it('prepareLossVsOutputChartData includes residual when non-zero', () => {
    const summary = computeInventorySummary(cloneSeedData())
    const rows = prepareLossVsOutputChartData(summary)
    expect(rows.some((r) => r.name.includes('Main output'))).toBe(true)
    expect(rows.some((r) => r.name.includes('Byproduct'))).toBe(true)
  })

  it('prepareTradeStatusChartData matches summary trade counts', () => {
    const summary = computeInventorySummary(cloneSeedData())
    const rows = prepareTradeStatusChartData(summary)
    const total = rows.reduce((s, r) => s + r.count, 0)
    expect(total).toBe(summary.tradeStatusCounts.reduce((s, r) => s + r.count, 0))
  })

  it('prepareFormChartData exposes all forms present in summary', () => {
    const summary = computeInventorySummary(cloneSeedData())
    const rows = prepareFormChartData(summary)
    expect(rows.find((r) => r.name === 'GREEN')).toBeTruthy()
  })
})
