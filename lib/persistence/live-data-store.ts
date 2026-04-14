import os from 'node:os'
import path from 'node:path'

import { cloneSeedData } from '@/data/seed-data'
import { parseLiveDataStore } from '@/lib/domain/validation'
import type { LiveDataStore } from '@/lib/domain/types'

import { createJsonFileStore } from './file-store'
import { isKvLiveDataConfigured, seedKvLiveDataIfEmpty, writeLiveDataToKv } from './live-data-kv'

let warnedVercelEphemeralStore = false

const isCanonicalProjectRoot = (projectRoot: string): boolean =>
  path.resolve(projectRoot) === path.resolve(getLiveDataProjectRoot())

/**
 * When Vercel KV credentials exist, the canonical store is read/written from Redis so every
 * serverless invocation sees the same data. Otherwise each instance keeps its own `/tmp` copy.
 */
const useKvForProjectRoot = (projectRoot: string): boolean =>
  isKvLiveDataConfigured() && isCanonicalProjectRoot(projectRoot)

const warnIfVercelWithoutSharedStore = (projectRoot: string) => {
  if (
    process.env.VERCEL === '1' &&
    !isKvLiveDataConfigured() &&
    isCanonicalProjectRoot(projectRoot) &&
    !warnedVercelEphemeralStore
  ) {
    warnedVercelEphemeralStore = true
    console.warn(
      '[ankuaru] Vercel deployment detected without shared Redis (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or KV_REST_API_*). Live data falls back to /tmp per instance — writes from one request may not appear on another. Add Upstash Redis from the Vercel Marketplace and connect it to this project.',
    )
  }
}

/**
 * Directory that contains `.ankuaru/live-data.json`.
 * On Vercel, `process.cwd()` is `/var/task` (read-only); only `/tmp` is writable.
 */
export const getLiveDataProjectRoot = (): string => {
  if (process.env.ANKUARU_PROJECT_ROOT) {
    return process.env.ANKUARU_PROJECT_ROOT
  }
  if (process.env.VERCEL === '1') {
    return path.join(os.tmpdir(), 'ankuaru-live-data')
  }
  return process.cwd()
}

export const getLiveDataFilePath = (projectRoot = getLiveDataProjectRoot()): string =>
  path.join(projectRoot, '.ankuaru', 'live-data.json')

export const createLiveDataStore = (projectRoot = getLiveDataProjectRoot()) =>
  createJsonFileStore<LiveDataStore>({
    filePath: getLiveDataFilePath(projectRoot),
    seedFactory: cloneSeedData,
    parse: parseLiveDataStore,
  })

export const initializeLiveDataStore = async (
  projectRoot = getLiveDataProjectRoot(),
): Promise<LiveDataStore> => {
  if (useKvForProjectRoot(projectRoot)) {
    return seedKvLiveDataIfEmpty()
  }
  warnIfVercelWithoutSharedStore(projectRoot)
  return createLiveDataStore(projectRoot).initialize()
}

export const readLiveDataStore = async (
  projectRoot = getLiveDataProjectRoot(),
): Promise<LiveDataStore> => {
  if (useKvForProjectRoot(projectRoot)) {
    return seedKvLiveDataIfEmpty()
  }
  warnIfVercelWithoutSharedStore(projectRoot)
  return createLiveDataStore(projectRoot).read()
}

export const writeLiveDataStore = async (
  value: LiveDataStore,
  projectRoot = getLiveDataProjectRoot(),
): Promise<LiveDataStore> => {
  if (useKvForProjectRoot(projectRoot)) {
    return writeLiveDataToKv(value)
  }
  warnIfVercelWithoutSharedStore(projectRoot)
  return createLiveDataStore(projectRoot).write(value)
}
