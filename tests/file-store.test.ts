// @vitest-environment node

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { createJsonFileStore } from '@/lib/persistence/file-store'

type ExampleStore = {
  items: Array<{ id: string }>
}

const tempDirs: string[] = []

const createTempDir = async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ankuaru-file-store-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('createJsonFileStore', () => {
  it('initializes missing files from the provided seed', async () => {
    const tempDir = await createTempDir()
    const filePath = path.join(tempDir, 'example.json')
    const store = createJsonFileStore<ExampleStore>({
      filePath,
      seedFactory: () => ({ items: [{ id: 'seed-item' }] }),
      parse: (value: unknown): ExampleStore => {
        if (
          typeof value !== 'object' ||
          value === null ||
          !('items' in value) ||
          !Array.isArray((value as { items?: unknown }).items)
        ) {
          throw new Error('Invalid ExampleStore')
        }

        return value as ExampleStore
      },
    })

    const initialized = await store.initialize()
    const rawFile = JSON.parse(await readFile(filePath, 'utf8')) as ExampleStore

    expect(initialized).toEqual({ items: [{ id: 'seed-item' }] })
    expect(rawFile).toEqual({ items: [{ id: 'seed-item' }] })
  })

  it('reads and writes typed JSON values without leaking mutable references', async () => {
    const tempDir = await createTempDir()
    const filePath = path.join(tempDir, 'example.json')
    const store = createJsonFileStore<ExampleStore>({
      filePath,
      seedFactory: () => ({ items: [{ id: 'first' }] }),
      parse: (value: unknown): ExampleStore => {
        const maybeStore = value as ExampleStore
        if (!Array.isArray(maybeStore?.items) || maybeStore.items.some((item) => !item?.id)) {
          throw new Error('Invalid ExampleStore')
        }

        return maybeStore
      },
    })

    const firstRead = await store.read()
    firstRead.items[0].id = 'mutated-in-memory'

    const secondRead = await store.read()
    await store.write({ items: [{ id: 'persisted-next' }] })
    const rawFile = JSON.parse(await readFile(filePath, 'utf8')) as ExampleStore

    expect(secondRead.items[0].id).toBe('first')
    expect(rawFile.items[0].id).toBe('persisted-next')
  })
})
