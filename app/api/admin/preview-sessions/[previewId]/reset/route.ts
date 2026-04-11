import { NextResponse } from 'next/server'

import { isValidAdminPreviewKey } from '@/lib/admin/preview-auth'
import { resetPreviewSession } from '@/lib/admin/preview-sessions'
import { MasterDataError } from '@/lib/master-data/crud'

const toErrorResponse = (error: unknown) => {
  if (error instanceof MasterDataError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : 'Unexpected error', code: 'internal_error' },
    { status: 500 },
  )
}

export async function POST(request: Request, context: { params: Promise<{ previewId: string }> }) {
  try {
    const { previewId } = await context.params
    let body: { adminKey?: string } | null = null
    try {
      body = (await request.json()) as { adminKey?: string }
    } catch {
      body = null
    }
    const key = request.headers.get('x-ankuaru-admin-preview-key')?.trim() || body?.adminKey?.trim()
    if (!isValidAdminPreviewKey(key)) {
      return NextResponse.json({ error: 'Admin preview key required', code: 'forbidden_preview' }, { status: 403 })
    }

    const ok = await resetPreviewSession(previewId)
    if (!ok) {
      return NextResponse.json({ error: 'Preview session not found', code: 'invalid_preview' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
