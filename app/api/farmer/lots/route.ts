import { NextResponse } from 'next/server'

import { requireFarmerSessionMatchesBody } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { createFarmerLotWithPickEvent, parseFarmerLotCreateRequest } from '@/lib/lots/farmer-pick-lot'

export const dynamic = 'force-dynamic'

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
    const parsed = parseFarmerLotCreateRequest(payload)
    await requireFarmerSessionMatchesBody(request, projectRoot, parsed.farmerId)
    const result = await createFarmerLotWithPickEvent(payload, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
