import { NextResponse } from 'next/server'

import { resolveBodyUserIdForAdminOrSelf } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { parseReviewTradeFinancingRequest, reviewTradeFinancing } from '@/lib/bank/review-trade-financing'

const BANK_USER_ROLES = ['bank', 'admin'] as const

const toErrorResponse = (error: unknown) => {
  if (error instanceof MasterDataError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    )
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: 'internal_error',
    },
    { status: 500 },
  )
}

export async function POST(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const payload: unknown = await request.json()
    const parsed = parseReviewTradeFinancingRequest(payload)
    const bankUserId = await resolveBodyUserIdForAdminOrSelf(
      request,
      projectRoot,
      parsed.bankUserId,
      BANK_USER_ROLES,
      'Bank user id',
    )
    const result = await reviewTradeFinancing({ ...(payload as object), bankUserId }, projectRoot)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
