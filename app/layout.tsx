import type { Metadata } from 'next'

import { SessionGate } from '@/components/auth/session-gate'

import './globals.css'

export const metadata: Metadata = {
  title: 'Ankuaru',
  description: 'Coffee traceability and trade MVP — role workspaces, ledger events, and discovery.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SessionGate>{children}</SessionGate>
      </body>
    </html>
  )
}
