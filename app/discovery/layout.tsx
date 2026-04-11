import type { ReactNode } from 'react'

export default function DiscoveryLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[60vh]">{children}</div>
}
