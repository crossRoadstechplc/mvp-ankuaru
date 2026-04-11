// @vitest-environment node

import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { seedData } from '@/data/seed-data'
import { collectLiveDataStoreErrors } from '@/lib/domain/validation'
import {
  getLiveDataFilePath,
  initializeLiveDataStore,
} from '@/lib/persistence/live-data-store'

const tempDirs: string[] = []

const createTempProjectRoot = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ankuaru-live-data-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('live data bootstrap', () => {
  it('keeps the seed aligned to the canonical store shape', () => {
    expect(collectLiveDataStoreErrors(seedData)).toEqual([])
  })

  it('creates .ankuaru/live-data.json from the seed on first initialization', async () => {
    const projectRoot = await createTempProjectRoot()
    const liveDataPath = getLiveDataFilePath(projectRoot)

    const store = await initializeLiveDataStore(projectRoot)
    const rawFile = JSON.parse(await readFile(liveDataPath, 'utf8'))

    await expect(access(liveDataPath)).resolves.toBeUndefined()
    expect(store).toEqual(seedData)
    expect(rawFile).toEqual(seedData)
  })
})
