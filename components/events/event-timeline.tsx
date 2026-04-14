import Link from 'next/link'

import { LabStatusBadge } from '@/components/labs/lab-status-badge'
import { LotLineagePanel, type LineageLotRef } from '@/components/lots/lot-lineage-panel'
import { CollapsibleSection } from '@/components/ui/collapsible-section'
import type { Lot } from '@/lib/domain/types'
import { exportEligibilityLabel } from '@/lib/labs/export-eligibility'
import type { DerivedLotState, LotTimelineEntry } from '@/lib/events/derived-state'
import { formatByproductKind } from '@/lib/lots/byproduct-inventory'
import { MASS_BALANCE_EPSILON_KG, sumLedgerByproductsKg } from '@/lib/lots/processing-mass-balance'
import { formatDisplayTimestamp } from '@/lib/format-operation-time'
import type { LotLineageHints } from '@/lib/traceability/lineage-graph'

type EventTimelineProps = {
  lot: Lot
  derived: DerivedLotState
  timeline: LotTimelineEntry[]
  /** DISPATCH / RECEIPT entries for this lot (subset of timeline). */
  transportTimeline: LotTimelineEntry[]
  /** Derived: IN_TRANSIT + latest DISPATCH flagged insured. */
  insuredInTransit: boolean
  /** When false, skip the origin field/farmer card (e.g. shown in a dedicated traceability panel). */
  showOriginCard?: boolean
  originFieldLabel?: string
  originFarmerLabel?: string
  lineage?: {
    parents: LineageLotRef[]
    children: LineageLotRef[]
    hints: LotLineageHints
    parentsOnly?: boolean
  }
}

const renderQty = (value?: number) => (value === undefined ? 'Not recorded' : `${value}`)

export function EventTimeline({
  lot,
  derived,
  timeline,
  transportTimeline,
  insuredInTransit,
  showOriginCard = true,
  originFieldLabel,
  originFarmerLabel,
  lineage,
}: EventTimelineProps) {
  return (
    <section className="space-y-6">
      {showOriginCard && (originFieldLabel || originFarmerLabel) ? (
        <CollapsibleSection kicker="Lot" title="Origin & participants" defaultOpen>
          <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Origin field</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{originFieldLabel ?? 'Not linked'}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Farmer (user)</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{originFarmerLabel ?? 'Not linked'}</dd>
            </div>
          </dl>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        kicker="Lot timeline"
        title={lot.publicLotCode}
        description="Events are the append-only ledger for this lot. The snapshot record is still shown, but the timeline is the source-of-truth view for operational history."
        defaultOpen
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/lots/${lot.id}/lineage`}
            className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950"
          >
            Lineage explorer
          </Link>
          <Link
            href="/admin/lots"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
          >
            Back to lots admin
          </Link>
        </div>
      </CollapsibleSection>

      {lineage ? (
        <CollapsibleSection kicker="Trace" title="Direct parents & transform hints" defaultOpen>
          <LotLineagePanel
            parents={lineage.parents}
            children={lineage.children}
            hints={lineage.hints}
            parentsOnly={lineage.parentsOnly}
          />
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection kicker="Metrics" title="Recorded events & derived state" defaultOpen>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Recorded events</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{derived.eventCount}</p>
        </article>
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Latest event</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">
            {derived.latestEventType ?? 'No linked events'}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {derived.lastSeenAt ? formatDisplayTimestamp(derived.lastSeenAt) : 'No timestamp yet'}
          </p>
        </article>
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Derived status hint</p>
          <p className="mt-3 text-xl font-semibold text-slate-950">{derived.statusHint ?? lot.status}</p>
        </article>
        <article className="rounded-3xl border border-black/10 bg-white p-5 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Output qty tracked</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{derived.totalOutputQty}</p>
        </article>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        kicker="Movement"
        title="Dispatch & receipt"
        description="Ledger entries for movement and custody handoffs. Vehicles and drivers are linked from master data."
        defaultOpen
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {insuredInTransit ? (
            <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-950 ring-1 ring-indigo-200">
              Insured in transit
            </span>
          ) : null}
          <Link
            href="/transport"
            className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-950"
          >
            Transport workspace
          </Link>
        </div>
        {transportTimeline.length === 0 ? (
          <p className="mt-5 text-sm text-slate-600">No dispatch or receipt events for this lot yet.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {transportTimeline.map((event) => {
              const meta =
                event.metadata && typeof event.metadata === 'object' && !Array.isArray(event.metadata)
                  ? (event.metadata as Record<string, unknown>)
                  : {}
              return (
                <li
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
                >
                  <p className="font-semibold text-slate-950">
                    {event.type} · {formatDisplayTimestamp(event.timestamp)}
                  </p>
                  <p className="mt-1 text-slate-600">
                    Actor: {event.actorRole} / {event.actorId}
                  </p>
                  {typeof meta.plateNumber === 'string' ? (
                    <p className="mt-1">Vehicle: {meta.plateNumber}</p>
                  ) : null}
                  {typeof meta.driverName === 'string' ? <p className="mt-1">Driver: {meta.driverName}</p> : null}
                  {typeof meta.locationStatus === 'string' ? (
                    <p className="mt-1">Location: {meta.locationStatus}</p>
                  ) : null}
                  {meta.insuredInTransit === true ? (
                    <p className="mt-1 font-medium text-indigo-800">Insurance flagged on this dispatch</p>
                  ) : null}
                  {typeof meta.nextCustodianId === 'string' ? (
                    <p className="mt-1">
                      Next custodian: {String(meta.nextCustodianRole ?? '')} / {meta.nextCustodianId}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection kicker="Snapshot" title="Snapshot summary & event ledger" defaultOpen>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Snapshot summary</p>
          <dl className="mt-5 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Form</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{lot.form}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Snapshot weight (kg)</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{lot.weight}</dd>
            </div>
            {lot.form === 'BYPRODUCT' && lot.byproductKind ? (
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="font-medium text-slate-500">Byproduct class</dt>
                <dd className="mt-2 text-base font-semibold text-slate-950">
                  {formatByproductKind(lot.byproductKind)}
                </dd>
              </div>
            ) : null}
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Current snapshot status</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{lot.status}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Lab quality</dt>
              <dd className="mt-2">
                <LabStatusBadge status={lot.labStatus} />
              </dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Export / trade eligibility</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">{exportEligibilityLabel(lot)}</dd>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Legal owner</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">
                {lot.ownerRole} / {lot.ownerId}
              </dd>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ownership is the commercial / legal interest; it does not move on dispatch or receipt.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-medium text-slate-500">Physical custodian</dt>
              <dd className="mt-2 text-base font-semibold text-slate-950">
                {lot.custodianRole} / {lot.custodianId}
              </dd>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                Custody is who holds and moves the material; transport events update custody, not ownership.
              </p>
            </div>
          </dl>
        </article>

        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Event ledger</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Summary first, details on demand</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                No events reference this lot yet.
              </div>
            ) : (
              timeline.map((event) => (
                <details
                  key={event.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                          {event.type}
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-950">
                          {event.direction === 'OUTPUT'
                            ? 'This lot was produced or advanced'
                            : event.direction === 'INPUT'
                              ? 'This lot was consumed or referenced as input'
                              : 'This lot stayed in place while the event updated its state'}
                        </p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{formatDisplayTimestamp(event.timestamp)}</p>
                        <p className="mt-1">
                          {event.actorRole} / {event.actorId}
                        </p>
                      </div>
                    </div>
                  </summary>

                  <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="font-medium text-slate-500">Movement</p>
                      <p className="mt-2">Input qty: {renderQty(event.inputQty)}</p>
                      <p className="mt-2">Output qty: {renderQty(event.outputQty)}</p>
                      <p className="mt-2">Input lots: {event.inputLotIds.join(', ') || 'None'}</p>
                      <p className="mt-2">Output lots: {event.outputLotIds.join(', ') || 'None'}</p>
                      {event.type === 'PROCESS' && event.inputQty !== undefined ? (
                        <p className="mt-3 text-slate-800">
                          Mass balance:{' '}
                          {Math.abs(
                            event.inputQty -
                              ((event.outputQty ?? 0) + sumLedgerByproductsKg(event.byproducts)),
                          ) <= MASS_BALANCE_EPSILON_KG
                            ? 'OK — input equals main output plus byproduct masses'
                            : 'Mismatch — review ledger quantities'}
                        </p>
                      ) : null}
                      {event.type === 'PROCESS' &&
                      event.metadata &&
                      typeof event.metadata === 'object' &&
                      'processingMethod' in event.metadata ? (
                        <p className="mt-2 text-slate-700">
                          Method:{' '}
                          <span className="font-medium">
                            {String((event.metadata as { processingMethod?: string }).processingMethod)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="font-medium text-slate-500">Metadata</p>
                      <pre className="mt-3 overflow-x-auto text-xs leading-6 text-slate-700">
                        {JSON.stringify(
                          {
                            byproducts: event.byproducts,
                            metadata: event.metadata,
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        </article>
        </div>
      </CollapsibleSection>
    </section>
  )
}
