import Link from 'next/link'

/** Shared pill link to the Discovery workspace (mounted in role layouts). */
export function DiscoveryNavLink() {
  return (
    <Link
      href="/discovery"
      className="rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm font-medium text-amber-950 hover:border-amber-400"
    >
      Discovery
    </Link>
  )
}
