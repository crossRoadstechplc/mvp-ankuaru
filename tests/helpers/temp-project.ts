import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const tempDirs: string[] = []

export const createTempProjectRoot = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ankuaru-stage-02-'))
  tempDirs.push(dir)
  return dir
}

export const cleanupTempProjectRoots = async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
}
