import { NextResponse } from 'next/server'

import { resolveBodyUserIdForAdminOrSelf } from '@/lib/auth/api-guards'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { parseSubmitLabResultRequest, submitLabResult } from '@/lib/labs/submit-lab-result'

const LAB_USER_ROLES = ['lab', 'admin'] as const

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
    const parsed = parseSubmitLabResultRequest(payload)
    const labUserId = await resolveBodyUserIdForAdminOrSelf(
      request,
      projectRoot,
      parsed.labUserId,
      LAB_USER_ROLES,
      'Lab user id',
    )
    const result = await submitLabResult({ ...(payload as object), labUserId }, projectRoot)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
