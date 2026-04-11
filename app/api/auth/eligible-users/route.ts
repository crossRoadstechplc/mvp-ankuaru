import { NextResponse } from 'next/server'

import { getEligibleLoginUsers } from '@/lib/auth/login-eligibility'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export async function GET() {
  const store = await initializeLiveDataStore()
  const users = getEligibleLoginUsers(store)
  return NextResponse.json({ users })
}
