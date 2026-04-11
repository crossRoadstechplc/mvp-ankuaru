'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { InventorySummary } from '@/lib/inventory/inventory-summary'
import {
  prepareFormChartData,
  prepareLossVsOutputChartData,
  prepareStageChartData,
  prepareTradeStatusChartData,
} from '@/lib/inventory/chart-data'

const PIE_COLORS = ['#0ea5e9', '#6366f1', '#a855f7', '#f97316', '#14b8a6', '#eab308', '#64748b', '#ec4899']

type InventoryChartsSectionProps = {
  summary: InventorySummary
}

export function InventoryChartsSection({ summary }: InventoryChartsSectionProps) {
  const stageData = prepareStageChartData(summary)
  const formData = prepareFormChartData(summary)
  const lossOutputData = prepareLossVsOutputChartData(summary)
  const tradeData = prepareTradeStatusChartData(summary)

  return (
    <section aria-labelledby="inventory-charts-heading" className="space-y-6">
      <h2 id="inventory-charts-heading" className="text-xl font-semibold text-slate-950">
        Charts
      </h2>
      <p className="text-sm text-slate-600">
        Expand a section to explore distributions. All figures use the current live data snapshot.
      </p>

      <details className="group rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm open:shadow-md">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950 outline-none marker:content-none">
          <span className="underline-offset-4 group-open:underline">Inventory by stage and form</span>
        </summary>
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <figure className="min-h-[300px] space-y-2">
            <figcaption>
              <h3 className="text-base font-semibold text-slate-900">Weight by operational stage</h3>
              <p className="text-sm text-slate-600">Total kg in lot snapshots grouped by status.</p>
            </figcaption>
            <div
              className="mt-3 h-[280px] w-full"
              role="img"
              aria-label="Bar chart of inventory weight in kilograms by operational stage"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 8, right: 8, left: 8, bottom: 56 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={60}
                    label={{ value: 'Operational stage', position: 'insideBottom', offset: -2 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value: number | string | undefined) => [
                      value === undefined ? '—' : `${value} kg`,
                      'Weight',
                    ]}
                  />
                  <Legend />
                  <Bar name="Weight (kg)" dataKey="weightKg" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>

          <figure className="min-h-[300px] space-y-2">
            <figcaption>
              <h3 className="text-base font-semibold text-slate-900">Lots by product form</h3>
              <p className="text-sm text-slate-600">Count of lot records per form.</p>
            </figcaption>
            <div
              className="mt-3 h-[280px] w-full"
              role="img"
              aria-label="Bar chart of lot counts by coffee form"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: 'Product form', position: 'insideBottom', offset: -4 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                    label={{ value: 'Lot count', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: number | string | undefined) => [value === undefined ? '—' : value, 'Lots']}
                  />
                  <Legend />
                  <Bar name="Lot count" dataKey="lotCount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </div>
      </details>

      <details className="group rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm open:shadow-md">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950 outline-none marker:content-none">
          <span className="underline-offset-4 group-open:underline">Loss vs output (PROCESS ledger)</span>
        </summary>
        <figure className="mt-6 min-h-[300px] space-y-2">
          <figcaption>
            <h3 className="text-base font-semibold text-slate-900">Main output vs byproduct streams vs residual</h3>
            <p className="text-sm text-slate-600">
              Aggregated from PROCESS events. Residual appears when inputs do not match outputs plus byproduct masses.
            </p>
          </figcaption>
          <div
            className="mt-3 h-[280px] w-full"
            role="img"
            aria-label="Bar chart comparing main output, byproduct streams, and unaccounted mass from processing"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={lossOutputData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: 'Mass category', position: 'insideBottom', offset: -4 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Mass (kg)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    value === undefined ? '—' : `${value} kg`,
                    'Mass',
                  ]}
                />
                <Legend />
                <Bar name="Mass (kg)" dataKey="valueKg" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </figure>
      </details>

      <details className="group rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
        <summary className="cursor-pointer list-none text-lg font-semibold text-slate-950 outline-none marker:content-none">
          <span className="underline-offset-4 group-open:underline">Trade status (placeholder)</span>
        </summary>
        <figure className="mt-6 min-h-[300px] space-y-2">
          <figcaption>
            <h3 className="text-base font-semibold text-slate-900">Trades by status</h3>
            <p className="text-sm text-slate-600">Counts from the trades collection for pipeline visibility.</p>
          </figcaption>
          {tradeData.length === 0 ? (
            <p className="text-sm text-slate-600">No trades in the current store.</p>
          ) : (
            <div className="mt-3 h-[280px] w-full" role="img" aria-label="Pie chart of trade counts by status">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tradeData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) => `${String(name)}: ${String(value ?? '')}`}
                  >
                    {tradeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | string | undefined, name: string | number | undefined) => [
                      `${value ?? '—'} trade(s)`,
                      name ?? 'Status',
                    ]}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </figure>
      </details>
    </section>
  )
}
