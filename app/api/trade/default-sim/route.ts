import { NextResponse } from 'next/server'

import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { simulateTradeDefault } from '@/lib/trade-lifecycle/finance-sim'

const toErrorResponse = (error: unknown) => {
  if (error instanceof MasterDataError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unexpected error', code: 'internal_error' },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const payload: unknown = await request.json()
    const result = await simulateTradeDefault(payload, projectRoot)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
