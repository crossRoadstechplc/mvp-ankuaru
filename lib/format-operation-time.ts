/**
 * Human-readable timestamps for operations, ledger rows, and lot cards.
 */
export function formatDisplayTimestamp(iso: string | undefined | null): string {
  if (!iso) {
    return '—'
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return iso
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d)
}
