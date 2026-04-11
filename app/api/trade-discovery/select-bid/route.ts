import { NextResponse } from 'next/server'

import { resolveBodyUserIdForAdminOrSelf } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { parseSelectWinningBidRequest, selectWinningBid } from '@/lib/trade-discovery/select-winning-bid'

const DISCOVERY_USER_ROLES = ['exporter', 'importer'] as const

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
    const parsed = parseSelectWinningBidRequest(payload)
    const rfqOwnerUserId = await resolveBodyUserIdForAdminOrSelf(
      request,
      projectRoot,
      parsed.rfqOwnerUserId,
      DISCOVERY_USER_ROLES,
      'RFQ owner user id',
    )
    const result = await selectWinningBid({ ...(payload as object), rfqOwnerUserId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
