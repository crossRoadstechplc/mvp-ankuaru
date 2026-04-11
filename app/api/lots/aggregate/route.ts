import { NextResponse } from 'next/server'

import { resolveActorIdForTransform } from '@/lib/auth/api-guards'
import { aggregateLots, parseAggregateLotsRequest } from '@/lib/lots/lot-transformation'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'

const TRANSFORM_ACTOR_ROLES = ['aggregator', 'processor', 'admin'] as const

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
    const parsed = parseAggregateLotsRequest(payload)
    const actorId = await resolveActorIdForTransform(
      request,
      projectRoot,
      parsed.actorId,
      TRANSFORM_ACTOR_ROLES,
    )
    const result = await aggregateLots({ ...(payload as object), actorId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
