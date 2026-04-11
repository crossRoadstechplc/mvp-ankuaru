import { NextResponse } from 'next/server'

import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { appendEvent, readEvents } from '@/lib/events/ledger'

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

export async function GET(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const events = await readEvents(projectRoot)
    return NextResponse.json(events)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const payload: unknown = await request.json()
    const event = await appendEvent(payload, projectRoot)
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
