import { NextResponse } from 'next/server'

import { resolveActorIdForTransform } from '@/lib/auth/api-guards'
import { parseProcessLotRequest, processLot } from '@/lib/lots/processing-engine'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'

const PROCESS_ACTOR_ROLES = ['processor', 'admin'] as const

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
    const parsed = parseProcessLotRequest(payload)
    const actorId = await resolveActorIdForTransform(
      request,
      projectRoot,
      parsed.actorId,
      PROCESS_ACTOR_ROLES,
    )
    const result = await processLot({ ...(payload as object), actorId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
