import { NextResponse } from 'next/server'

import { parseLiveDataStore } from '@/lib/domain/validation'
import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { initializeLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

const handle = async (request: Request, run: (projectRoot: string) => Promise<unknown>) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const result = await run(projectRoot)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MasterDataError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
}

export async function GET(request: Request) {
  return handle(request, (projectRoot) => initializeLiveDataStore(projectRoot))
}

export async function PUT(request: Request) {
  try {
    const payload: unknown = await request.json()
    const liveDataStore = parseLiveDataStore(payload)
    return await handle(request, (projectRoot) => writeLiveDataStore(liveDataStore, projectRoot))
  } catch (error) {
    if (error instanceof MasterDataError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Invalid live data payload',
      },
      { status: 400 },
    )
  }
}
