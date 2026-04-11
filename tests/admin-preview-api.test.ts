// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { cloneSeedData } from '@/data/seed-data'
import { GET as getLiveData, PUT as putLiveData } from '@/app/api/live-data/route'
import { POST as postPreviewSessions, DELETE as deletePreviewSessions } from '@/app/api/admin/preview-sessions/route'
import { POST as postReset } from '@/app/api/admin/preview-sessions/[previewId]/reset/route'
import { DEFAULT_ADMIN_PREVIEW_KEY } from '@/lib/admin/preview-constants'
import { destroyPreviewSession } from '@/lib/admin/preview-sessions'

const adminHeaders = {
  'content-type': 'application/json',
  'x-ankuaru-admin-preview-key': DEFAULT_ADMIN_PREVIEW_KEY,
}

describe('admin preview API', () => {
  it('rejects session creation without admin key', async () => {
    const res = await postPreviewSessions(
      new Request('http://localhost/api/admin/preview-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('creates a preview session with valid key', async () => {
    const res = await postPreviewSessions(
      new Request('http://localhost/api/admin/preview-sessions', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ adminKey: DEFAULT_ADMIN_PREVIEW_KEY }),
      }),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { previewId: string }
    expect(body.previewId).toMatch(/^pv-/)
    await destroyPreviewSession(body.previewId)
  })

  it('live-data PUT returns 404 for invalid preview id (after parse)', async () => {
    const res = await putLiveData(
      new Request('http://localhost/api/live-data', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-ankuaru-preview-id': 'pv-bad',
        },
        body: JSON.stringify(cloneSeedData()),
      }),
    )
    expect(res.status).toBe(404)
  })

  it('live-data GET returns 404 for invalid preview id', async () => {
    const res = await getLiveData(
      new Request('http://localhost/api/live-data', {
        headers: { 'x-ankuaru-preview-id': 'pv-does-not-exist' },
      }),
    )
    expect(res.status).toBe(404)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('invalid_preview')
  })

  it('reset endpoint requires admin key', async () => {
    const res = await postReset(
      new Request('http://localhost/api/admin/preview-sessions/pv-x/reset', { method: 'POST' }),
      { params: Promise.resolve({ previewId: 'pv-x' }) },
    )
    expect(res.status).toBe(403)
  })

  it('delete destroys session with admin key', async () => {
    const created = await postPreviewSessions(
      new Request('http://localhost/api/admin/preview-sessions', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ adminKey: DEFAULT_ADMIN_PREVIEW_KEY }),
      }),
    )
    const { previewId } = (await created.json()) as { previewId: string }

    const del = await deletePreviewSessions(
      new Request('http://localhost/api/admin/preview-sessions', {
        method: 'DELETE',
        headers: adminHeaders,
        body: JSON.stringify({ adminKey: DEFAULT_ADMIN_PREVIEW_KEY, previewId }),
      }),
    )
    expect(del.status).toBe(200)
  })

  it('live-data GET reads isolated store with preview header', async () => {
    const created = await postPreviewSessions(
      new Request('http://localhost/api/admin/preview-sessions', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ adminKey: DEFAULT_ADMIN_PREVIEW_KEY }),
      }),
    )
    const { previewId } = (await created.json()) as { previewId: string }

    const res = await getLiveData(
      new Request('http://localhost/api/live-data', {
        headers: {
          'x-ankuaru-preview-id': previewId,
        },
      }),
    )
    expect(res.status).toBe(200)
    const store = (await res.json()) as { lots: unknown[] }
    expect(Array.isArray(store.lots)).toBe(true)

    await destroyPreviewSession(previewId)
  })
})
