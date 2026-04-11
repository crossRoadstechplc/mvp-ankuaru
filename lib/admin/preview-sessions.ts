import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { cloneSeedData } from '@/data/seed-data'
import { parseLiveDataStore } from '@/lib/domain/validation'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'

/** previewId → isolated project root (temp directory with its own `.ankuaru/live-data.json`). */
const previewRoots = new Map<string, string>()

export const getPreviewProjectRoot = (previewId: string | null | undefined): string | undefined => {
  if (!previewId?.trim()) {
    return undefined
  }
  return previewRoots.get(previewId.trim())
}

export const hasPreviewSession = (previewId: string): boolean => previewRoots.has(previewId.trim())

/**
 * Creates a temp project root, seeds live data, and registers a preview id.
 * Isolated from the default cwd store.
 */
export const createPreviewSession = async (): Promise<{ previewId: string; projectRoot: string }> => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ankuaru-preview-'))
  const previewId = `pv-${randomUUID().slice(0, 8)}`
  previewRoots.set(previewId, dir)
  await readLiveDataStore(dir)
  return { previewId, projectRoot: dir }
}

/** Re-seed preview store from canonical seed (same as fresh file). */
export const resetPreviewSession = async (previewId: string): Promise<boolean> => {
  const root = previewRoots.get(previewId.trim())
  if (!root) {
    return false
  }
  const fresh = parseLiveDataStore(cloneSeedData())
  await writeLiveDataStore(fresh, root)
  return true
}

/** Remove temp files and unregister preview id. */
export const destroyPreviewSession = async (previewId: string): Promise<void> => {
  const id = previewId.trim()
  const root = previewRoots.get(id)
  if (!root) {
    return
  }
  previewRoots.delete(id)
  await rm(root, { recursive: true, force: true })
}

/** Test helper: register an existing directory as a preview session (same process only). */
export const __registerPreviewSessionForTest = (previewId: string, projectRoot: string): void => {
  previewRoots.set(previewId, projectRoot)
}

/** Test helper: clear all sessions without deleting dirs (caller cleans dirs). */
export const __clearPreviewSessionsForTest = (): void => {
  previewRoots.clear()
}
