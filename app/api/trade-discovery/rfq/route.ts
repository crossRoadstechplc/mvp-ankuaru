import { NextResponse } from 'next/server'

import { resolveBodyUserIdForAdminOrSelf } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { createDiscoveryRfq, parseCreateRfqRequest } from '@/lib/trade-discovery/create-rfq'

const DISCOVERY_USER_ROLES = ['processor', 'exporter', 'importer'] as const

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
    const parsed = parseCreateRfqRequest(payload)
    const createdByUserId = await resolveBodyUserIdForAdminOrSelf(
      request,
      projectRoot,
      parsed.createdByUserId,
      DISCOVERY_USER_ROLES,
      'RFQ author user id',
    )
    const result = await createDiscoveryRfq({ ...(payload as object), createdByUserId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
