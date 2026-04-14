import type { Event, LiveDataStore, Lot, Role } from '@/lib/domain/types'

/** Recent ledger rows on role home + matching focus-area history modules. */
export const ROLE_HOME_LEDGER_HISTORY_LIMIT = 8

export type RoleHomeLedgerRow = {
  key: string
  timestamp: string
  title: string
  detail: string
  href: string
  linkLabel: string
}

export function resolveLotPublicCode(
  lots: readonly Pick<Lot, 'id' | 'publicLotCode'>[],
  lotId: string | undefined,
): string {
  if (!lotId) {
    return '—'
  }
  return lots.find((l) => l.id === lotId)?.publicLotCode ?? lotId
}

export function primaryLotIdFromEvent(event: Event): string | undefined {
  const fromOutputs = event.outputLotIds.find(Boolean)
  if (fromOutputs) {
    return fromOutputs
  }
  return event.inputLotIds.find(Boolean)
}

function parentsHref(lotId: string | undefined): string | null {
  if (!lotId) {
    return null
  }
  return `/lots/${lotId}/parents`
}

function sortEventsDesc(events: Event[]): Event[] {
  return [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

function actorMatches(event: Event, uid: string | undefined): boolean {
  if (!uid) {
    return true
  }
  return event.actorId === uid
}

function rfqIdFromMetadata(event: Event): string | undefined {
  const raw = event.metadata?.rfqId
  return typeof raw === 'string' ? raw : undefined
}

function tradeIdFromMetadata(event: Event): string | undefined {
  const raw = event.metadata?.tradeId
  return typeof raw === 'string' ? raw : undefined
}

export function describeProcessEventFromLots(
  lots: readonly Pick<Lot, 'id' | 'publicLotCode'>[],
  event: Event,
): { title: string; detail: string; href: string | null; linkLabel: 'Parent lots' } {
  const inputCodes = event.inputLotIds.map((id) => resolveLotPublicCode(lots, id)).join(', ')
  const outputs = event.outputLotIds.filter(Boolean)
  const outputCodes = outputs.map((id) => resolveLotPublicCode(lots, id)).join(', ')
  const primaryOut = outputs[0] ?? event.inputLotIds.find(Boolean)
  const href = parentsHref(primaryOut)
  const flow =
    inputCodes && outputCodes ? `${inputCodes} → ${outputCodes}` : outputCodes || inputCodes || event.type
  const qty = event.inputQty !== undefined ? `${event.inputQty} kg in` : ''
  return {
    title: outputCodes || resolveLotPublicCode(lots, primaryLotIdFromEvent(event)),
    detail: [flow, qty].filter(Boolean).join(' · '),
    href,
    linkLabel: 'Parent lots',
  }
}

export function describeProcessEvent(store: LiveDataStore, event: Event) {
  return describeProcessEventFromLots(store.lots, event)
}

export function getRoleHomeLedgerRows(
  role: Role,
  store: LiveDataStore,
  selectedUserId: string | null | undefined,
): RoleHomeLedgerRow[] {
  const uid = selectedUserId ?? undefined

  switch (role) {
    case 'farmer': {
      return sortEventsDesc(store.events.filter((e) => e.type === 'PICK' && actorMatches(e, uid)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const outId = e.outputLotIds[0]
          const href = parentsHref(outId)
          if (!outId || !href) {
            return []
          }
          const fieldId = typeof e.metadata?.fieldId === 'string' ? e.metadata.fieldId : undefined
          const field = fieldId ? store.fields.find((f) => f.id === fieldId) : undefined
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, outId),
              detail: [e.outputQty !== undefined ? `${e.outputQty} kg` : null, field?.name ?? 'Origin pick']
                .filter(Boolean)
                .join(' · '),
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'aggregator': {
      return sortEventsDesc(
        store.events.filter((e) => e.type === 'AGGREGATE' && actorMatches(e, uid)),
      )
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const outId = e.outputLotIds[0]
          const href = parentsHref(outId)
          if (!outId || !href) {
            return []
          }
          const parentCodes = e.inputLotIds.map((id) => resolveLotPublicCode(store.lots, id)).filter(Boolean)
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, outId),
              detail: [`${e.inputLotIds.length} source snapshot(s)`, parentCodes.slice(0, 3).join(', ') || '—'].join(
                ' · ',
              ),
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'processor': {
      return sortEventsDesc(store.events.filter((e) => e.type === 'PROCESS' && actorMatches(e, uid)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const d = describeProcessEventFromLots(store.lots, e)
          if (!d.href) {
            return []
          }
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: d.title,
              detail: d.detail,
              href: d.href,
              linkLabel: d.linkLabel,
            },
          ]
        })
    }
    case 'transporter': {
      return sortEventsDesc(
        store.events.filter((e) => ['DISPATCH', 'RECEIPT'].includes(e.type) && actorMatches(e, uid)),
      )
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          if (!lotId || !href) {
            return []
          }
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, lotId),
              detail: `${e.type} · lot custody update`,
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'lab': {
      return sortEventsDesc(store.events.filter((e) => e.type === 'LAB_RESULT' && actorMatches(e, uid)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          if (!lotId || !href) {
            return []
          }
          const labResultId = typeof e.metadata?.labResultId === 'string' ? e.metadata.labResultId : undefined
          const result = labResultId ? store.labResults.find((r) => r.id === labResultId) : undefined
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, lotId),
              detail:
                [result?.status, result?.score !== undefined ? `score ${result.score}` : null].filter(Boolean).join(' · ') ||
                'Lab result',
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'exporter': {
      return sortEventsDesc(
        store.events.filter(
          (e) =>
            actorMatches(e, uid) &&
            (e.type === 'RFQ_CREATED' || e.type === 'BID_SUBMITTED' || e.type === 'BID_SELECTED'),
        ),
      )
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          if (e.type === 'RFQ_CREATED') {
            const rfqId = rfqIdFromMetadata(e)
            if (!rfqId) {
              return []
            }
            return [
              {
                key: e.id,
                timestamp: e.timestamp,
                title: `RFQ ${rfqId}`,
                detail: 'Opportunity published',
                href: `/trade/rfqs/${rfqId}`,
                linkLabel: 'Open RFQ',
              },
            ]
          }
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          if (!lotId || !href) {
            return []
          }
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, lotId),
              detail: e.type === 'BID_SUBMITTED' ? 'Bid submitted · ledger' : 'Bid selected · ledger',
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'importer': {
      return sortEventsDesc(
        store.events.filter(
          (e) =>
            actorMatches(e, uid) &&
            (e.type === 'RFQ_CREATED' || e.type === 'BID_SELECTED' || e.type === 'BID_SUBMITTED'),
        ),
      )
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          if (e.type === 'RFQ_CREATED') {
            const rfqId = rfqIdFromMetadata(e)
            if (!rfqId) {
              return []
            }
            return [
              {
                key: e.id,
                timestamp: e.timestamp,
                title: `RFQ ${rfqId}`,
                detail: 'Opportunity published',
                href: `/trade/rfqs/${rfqId}`,
                linkLabel: 'Open RFQ',
              },
            ]
          }
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          if (!lotId || !href) {
            return []
          }
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, lotId),
              detail: e.type,
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'bank': {
      return sortEventsDesc(store.events.filter((e) => e.type === 'BANK_APPROVED' && actorMatches(e, uid)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .flatMap((e): RoleHomeLedgerRow[] => {
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          if (!lotId || !href) {
            return []
          }
          const tradeId = tradeIdFromMetadata(e)
          return [
            {
              key: e.id,
              timestamp: e.timestamp,
              title: resolveLotPublicCode(store.lots, lotId),
              detail: tradeId ? `Trade ${tradeId} · financing gate` : 'Bank approval · ledger',
              href,
              linkLabel: 'Parent lots',
            },
          ]
        })
    }
    case 'admin': {
      const adminTypes = new Set<Event['type']>([
        'INTEGRITY_FLAGGED',
        'AGGREGATE',
        'PROCESS',
        'BANK_APPROVED',
        'VALIDATE_LOT',
      ])
      return sortEventsDesc(store.events.filter((e) => adminTypes.has(e.type)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .map((e) => {
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          return {
            key: e.id,
            timestamp: e.timestamp,
            title: lotId ? resolveLotPublicCode(store.lots, lotId) : e.type,
            detail: `${e.type} · ${e.actorRole}`,
            href: href ?? '/admin/integrity',
            linkLabel: lotId ? 'Parent lots' : 'Open integrity',
          }
        })
    }
    case 'regulator': {
      const regulatorTypes = new Set<Event['type']>([
        'INTEGRITY_FLAGGED',
        'AGGREGATE',
        'PROCESS',
        'BANK_APPROVED',
        'VALIDATE_LOT',
      ])
      return sortEventsDesc(store.events.filter((e) => regulatorTypes.has(e.type)))
        .slice(0, ROLE_HOME_LEDGER_HISTORY_LIMIT)
        .map((e) => {
          const lotId = primaryLotIdFromEvent(e)
          const href = parentsHref(lotId)
          return {
            key: e.id,
            timestamp: e.timestamp,
            title: lotId ? resolveLotPublicCode(store.lots, lotId) : e.type,
            detail: `${e.type} · ${e.actorRole}`,
            href: href ?? '/regulator',
            linkLabel: lotId ? 'Parent lots' : 'Reviewer home',
          }
        })
    }
    default:
      return []
  }
}

export function roleHomeLedgerCopy(role: Role): {
  kicker: string
  title: string
  blurb: string
} {
  switch (role) {
    case 'farmer':
      return {
        kicker: 'Farmer',
        title: 'Recent origin picks',
        blurb: 'Each row is a lot code you created from the field. Open parent sources for that snapshot only.',
      }
    case 'aggregator':
      return {
        kicker: 'Aggregator',
        title: 'Recent aggregations',
        blurb: 'Output lot codes you produced. Follow a row to see direct parent lots only.',
      }
    case 'processor':
      return {
        kicker: 'Processor',
        title: 'Recent processing runs',
        blurb: 'Primary output codes from PROCESS events. Open parent lots for that output snapshot.',
      }
    case 'transporter':
      return {
        kicker: 'Transport',
        title: 'Recent dispatch & receipt',
        blurb: 'Lot codes touched on your custody events. Parent-only lineage for each lot.',
      }
    case 'lab':
      return {
        kicker: 'Lab',
        title: 'Recent lab results',
        blurb: 'Lots you scored or gated. Parent-only view stays on upstream snapshots.',
      }
    case 'exporter':
      return {
        kicker: 'Exporter',
        title: 'Recent trade & bid activity',
        blurb: 'RFQs you published open in Trade; lot-linked rows jump to parent sources only.',
      }
    case 'importer':
      return {
        kicker: 'Importer',
        title: 'Recent RFQs & selections',
        blurb: 'Opportunities you raised vs lots in winning paths. Lot rows open parent-only detail.',
      }
    case 'bank':
      return {
        kicker: 'Bank',
        title: 'Recent financing approvals',
        blurb: 'Collateral lots referenced on BANK_APPROVED events — parent snapshots only.',
      }
    case 'admin':
      return {
        kicker: 'Admin',
        title: 'Cross-role ledger highlights',
        blurb: 'Latest integrity, validation, and transform events across the demo store.',
      }
    case 'regulator':
      return {
        kicker: 'Regulator',
        title: 'Oversight ledger sample',
        blurb: 'Read-only slice of high-signal events; lot rows resolve to parent-only views.',
      }
    default:
      return { kicker: 'Workspace', title: 'Recent activity', blurb: '' }
  }
}

export function roleHomeLedgerAccent(role: Role): { section: string; kicker: string; link: string } {
  switch (role) {
    case 'farmer':
      return {
        section: 'rounded-[2rem] border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-emerald-900',
        link: 'text-emerald-900',
      }
    case 'aggregator':
      return {
        section: 'rounded-[2rem] border border-amber-200 bg-amber-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-amber-800',
        link: 'text-amber-900',
      }
    case 'processor':
      return {
        section: 'rounded-[2rem] border border-violet-200 bg-violet-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-violet-800',
        link: 'text-violet-900',
      }
    case 'transporter':
      return {
        section: 'rounded-[2rem] border border-sky-200 bg-sky-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-sky-900',
        link: 'text-sky-900',
      }
    case 'lab':
      return {
        section: 'rounded-[2rem] border border-cyan-200 bg-cyan-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-cyan-900',
        link: 'text-cyan-900',
      }
    case 'exporter':
      return {
        section: 'rounded-[2rem] border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-indigo-900',
        link: 'text-indigo-900',
      }
    case 'importer':
      return {
        section: 'rounded-[2rem] border border-teal-200 bg-teal-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-teal-900',
        link: 'text-teal-900',
      }
    case 'bank':
      return {
        section: 'rounded-[2rem] border border-rose-200 bg-rose-50/40 p-6 shadow-sm shadow-black/5',
        kicker: 'text-rose-900',
        link: 'text-rose-900',
      }
    case 'admin':
      return {
        section: 'rounded-[2rem] border border-slate-300 bg-slate-50/90 p-6 shadow-sm shadow-black/5',
        kicker: 'text-slate-700',
        link: 'text-slate-900',
      }
    case 'regulator':
      return {
        section: 'rounded-[2rem] border border-amber-200/80 bg-amber-50/30 p-6 shadow-sm shadow-black/5',
        kicker: 'text-amber-950',
        link: 'text-amber-950',
      }
    default:
      return {
        section: 'rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-black/5',
        kicker: 'text-slate-600',
        link: 'text-slate-900',
      }
  }
}
