import type { Lot } from '@/lib/domain/types'

type Props = {
  lot: Lot
}

/**
 * High-visibility warning when a lot failed integrity rules or is quarantined.
 */
export function LotIntegrityBanner({ lot }: Props) {
  const compromised = lot.integrityStatus !== 'OK'
  const quarantined = lot.status === 'QUARANTINED'

  if (!compromised && !quarantined) {
    return null
  }

  return (
    <section
      className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/90 p-5 shadow-sm shadow-rose-900/5"
      role="status"
      aria-live="polite"
      data-testid="lot-integrity-banner"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-rose-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          Integrity
        </span>
        {compromised ? (
          <span className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-900">
            Compromised
          </span>
        ) : null}
        {quarantined ? (
          <span className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-900">
            Quarantined
          </span>
        ) : null}
      </div>
      {lot.quarantineReason ? (
        <p className="mt-3 text-sm leading-relaxed text-rose-950">{lot.quarantineReason}</p>
      ) : (
        <p className="mt-3 text-sm text-rose-950">This lot is blocked for operational actions until cleared.</p>
      )}
    </section>
  )
}
