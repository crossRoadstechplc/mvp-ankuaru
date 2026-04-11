// @vitest-environment node

import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
  __clearPreviewSessionsForTest,
  __registerPreviewSessionForTest,
  createPreviewSession,
  destroyPreviewSession,
  getPreviewProjectRoot,
  resetPreviewSession,
} from '@/lib/admin/preview-sessions'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

afterEach(() => {
  __clearPreviewSessionsForTest()
})

describe('preview session namespace helpers', () => {
  it('creates isolated roots and registers ids', async () => {
    const { previewId, projectRoot } = await createPreviewSession()
    expect(previewId.startsWith('pv-')).toBe(true)
    expect(getPreviewProjectRoot(previewId)).toBe(projectRoot)
    const store = await readLiveDataStore(projectRoot)
    expect(store.lots.length).toBeGreaterThan(0)
    await destroyPreviewSession(previewId)
  })

  it('resetPreviewSession re-seeds data', async () => {
    const { previewId, projectRoot } = await createPreviewSession()
    const before = await readLiveDataStore(projectRoot)
    const store = await readLiveDataStore(projectRoot)
    store.lots[0] = { ...store.lots[0], weight: 99999 }
    await writeLiveDataStore(store, projectRoot)
    const messed = await readLiveDataStore(projectRoot)
    expect(messed.lots[0].weight).toBe(99999)

    const ok = await resetPreviewSession(previewId)
    expect(ok).toBe(true)
    const after = await readLiveDataStore(projectRoot)
    expect(after.lots[0].weight).toBe(before.lots[0].weight)
    await destroyPreviewSession(previewId)
  })

  it('resetPreviewSession returns false for unknown id', async () => {
    const ok = await resetPreviewSession('pv-unknown999')
    expect(ok).toBe(false)
  })

  it('__registerPreviewSessionForTest maps id to directory', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'ankuaru-reg-test-'))
    try {
      __registerPreviewSessionForTest('pv-testmanual', dir)
      expect(getPreviewProjectRoot('pv-testmanual')).toBe(dir)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
