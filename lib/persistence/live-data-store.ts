import path from 'node:path'

import { cloneSeedData } from '@/data/seed-data'
import { parseLiveDataStore } from '@/lib/domain/validation'
import type { LiveDataStore } from '@/lib/domain/types'

import { createJsonFileStore } from './file-store'

export const getLiveDataFilePath = (projectRoot = process.cwd()): string =>
  path.join(projectRoot, '.ankuaru', 'live-data.json')

export const createLiveDataStore = (projectRoot = process.cwd()) =>
  createJsonFileStore<LiveDataStore>({
    filePath: getLiveDataFilePath(projectRoot),
    seedFactory: cloneSeedData,
    parse: parseLiveDataStore,
  })

export const initializeLiveDataStore = async (
  projectRoot = process.cwd(),
): Promise<LiveDataStore> => createLiveDataStore(projectRoot).initialize()

export const readLiveDataStore = async (
  projectRoot = process.cwd(),
): Promise<LiveDataStore> => createLiveDataStore(projectRoot).read()

export const writeLiveDataStore = async (
  value: LiveDataStore,
  projectRoot = process.cwd(),
): Promise<LiveDataStore> => createLiveDataStore(projectRoot).write(value)
