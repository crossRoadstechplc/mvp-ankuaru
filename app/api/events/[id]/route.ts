import { NextResponse } from 'next/server'

import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { readEventById, rejectEventMutation } from '@/lib/events/ledger'

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

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const params = await context.params
    const event = await readEventById(params.id, projectRoot)
    return NextResponse.json(event)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function PATCH() {
  return rejectEventMutation()
}

export async function DELETE() {
  return rejectEventMutation()
}
