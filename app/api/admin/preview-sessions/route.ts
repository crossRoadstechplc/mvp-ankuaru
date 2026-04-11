import { NextResponse } from 'next/server'

import { isValidAdminPreviewKey } from '@/lib/admin/preview-auth'
import { createPreviewSession, destroyPreviewSession } from '@/lib/admin/preview-sessions'
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

const readAdminKey = (request: Request, body: { adminKey?: string } | null): string | undefined =>
  request.headers.get('x-ankuaru-admin-preview-key')?.trim() || body?.adminKey?.trim()

export async function POST(request: Request) {
  try {
    let body: { adminKey?: string } | null = null
    try {
      body = (await request.json()) as { adminKey?: string }
    } catch {
      body = null
    }
    const key = readAdminKey(request, body)
    if (!isValidAdminPreviewKey(key)) {
      return NextResponse.json({ error: 'Admin preview key required', code: 'forbidden_preview' }, { status: 403 })
    }

    const session = await createPreviewSession()
    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  try {
    let body: { adminKey?: string; previewId?: string } | null = null
    try {
      body = (await request.json()) as { adminKey?: string; previewId?: string }
    } catch {
      body = null
    }
    const key = readAdminKey(request, body)
    if (!isValidAdminPreviewKey(key)) {
      return NextResponse.json({ error: 'Admin preview key required', code: 'forbidden_preview' }, { status: 403 })
    }

    const previewId = body?.previewId?.trim() ?? new URL(request.url).searchParams.get('previewId')?.trim()
    if (!previewId) {
      return NextResponse.json({ error: 'previewId required', code: 'invalid_payload' }, { status: 400 })
    }

    await destroyPreviewSession(previewId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
