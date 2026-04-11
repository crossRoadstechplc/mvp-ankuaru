import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type JsonStoreOptions<T> = {
  filePath: string
  seedFactory: () => T
  parse: (value: unknown) => T
}

const writePrettyJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export const createJsonFileStore = <T>({
  filePath,
  seedFactory,
  parse,
}: JsonStoreOptions<T>) => {
  const initialize = async (): Promise<T> => {
    try {
      const existing = await readFile(filePath, 'utf8')
      return parse(JSON.parse(existing) as unknown)
    } catch (error) {
      const missingFile =
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'

      if (!missingFile) {
        throw error
      }

      // First boot copies the canonical dummy seed into the live runtime file.
      const seed = parse(seedFactory())
      await writePrettyJson(filePath, seed)
      return seed
    }
  }

  const read = async (): Promise<T> => {
    const initialized = await initialize()
    return structuredClone(initialized)
  }

  const write = async (nextValue: T): Promise<T> => {
    const parsed = parse(nextValue)
    await writePrettyJson(filePath, parsed)
    return structuredClone(parsed)
  }

  return {
    filePath,
    initialize,
    read,
    write,
  }
}
