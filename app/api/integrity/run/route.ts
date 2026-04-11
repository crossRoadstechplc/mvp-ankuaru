import { NextResponse } from 'next/server'

import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'

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

type RunBody = {
  apply?: boolean
}

export async function POST(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    let apply = true
    try {
      const body = (await request.json()) as RunBody
      if (typeof body.apply === 'boolean') {
        apply = body.apply
      }
    } catch {
      /* empty body */
    }

    const result = await runIntegrityEngine(projectRoot, { apply })

    const issueEntries = [...result.evaluation.issuesByLotId.entries()].filter(([, issues]) => issues.length > 0)

    return NextResponse.json(
      {
        apply,
        issueCount: issueEntries.length,
        issuesByLotId: Object.fromEntries(issueEntries.map(([id, issues]) => [id, issues])),
        updatedLotIds: result.updatedLots.map((l) => l.id),
        eventsAppended: result.eventsAppended.length,
      },
      { status: 200 },
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
