import { NextResponse } from 'next/server'

import { resolveActorIdForTransform } from '@/lib/auth/api-guards'
import { parseValidateLotRequest, validateLot } from '@/lib/lots/validate-lot'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'

const VALIDATE_ACTOR_ROLES = ['aggregator', 'admin'] as const

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
    const parsed = parseValidateLotRequest(payload)
    const actorId = await resolveActorIdForTransform(
      request,
      projectRoot,
      parsed.actorId,
      VALIDATE_ACTOR_ROLES,
    )
    const result = await validateLot({ ...(payload as object), actorId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
