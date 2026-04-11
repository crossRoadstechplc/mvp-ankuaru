import { NextResponse } from 'next/server'

import { resolveBodyUserIdForAdminOrSelf } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { createDiscoveryBid, parseCreateBidRequest } from '@/lib/trade-discovery/create-bid'

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
    const parsed = parseCreateBidRequest(payload)
    const bidderUserId = await resolveBodyUserIdForAdminOrSelf(
      request,
      projectRoot,
      parsed.bidderUserId,
      DISCOVERY_USER_ROLES,
      'Bidder user id',
    )
    const result = await createDiscoveryBid({ ...(payload as object), bidderUserId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
