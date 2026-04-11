import { NextResponse } from 'next/server'

import { getAuthorizedLotIdsForImporter } from '@/lib/permissions/importer-access'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

const toErrorResponse = (error: unknown) => {
  if (error instanceof MasterDataError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unexpected error', code: 'internal_error' },
    { status: 500 },
  )
}

export async function GET(request: Request) {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const url = new URL(request.url)
    const buyerUserId = url.searchParams.get('buyerUserId')
    if (!buyerUserId || buyerUserId.trim().length === 0) {
      return NextResponse.json({ error: 'buyerUserId is required', code: 'invalid_query' }, { status: 400 })
    }
    const store = await readLiveDataStore(projectRoot)
    const lotIds = getAuthorizedLotIdsForImporter(store, buyerUserId)
    return NextResponse.json({ buyerUserId, lotIds })
  } catch (error) {
    return toErrorResponse(error)
  }
}
