import { randomUUID } from 'node:crypto'

import type { LiveDataStore, Trade } from '@/lib/domain/types'
import { getPreviewProjectRoot } from '@/lib/admin/preview-sessions'
import { isLotExportEligible } from '@/lib/labs/export-eligibility'
import {
  getLiveDataProjectRoot,
  readLiveDataStore,
  writeLiveDataStore,
} from '@/lib/persistence/live-data-store'

import {
  MASTER_COLLECTION_SPECS,
  type MasterCollectionEntry,
  type MasterCollectionName,
  type MasterEntityMap,
  type MasterStoreKeyMap,
} from './validation'

import { MasterDataError } from './master-data-error'

export { MasterDataError }

const createTimestamp = (): string => new Date().toISOString()

export const generateEntityId = (collectionName: MasterCollectionName): string => {
  const prefix = MASTER_COLLECTION_SPECS[collectionName].idPrefix
  return `${prefix}-${randomUUID().slice(0, 8)}`
}

export const assertValidEntityId = (id: string): string => {
  const nextId = id.trim()
  if (nextId.length === 0) {
    throw new MasterDataError('Entity id is required', 400, 'invalid_id')
  }

  return nextId
}

export const readCollection = async <Name extends MasterCollectionName>(
  collectionName: Name,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name][]> => {
  const store = await readLiveDataStore(projectRoot)
  const storeKey = MASTER_COLLECTION_SPECS[collectionName].storeKey as MasterStoreKeyMap[Name]
  return structuredClone(store[storeKey]) as MasterEntityMap[Name][]
}

export const readEntityById = async <Name extends MasterCollectionName>(
  collectionName: Name,
  id: string,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name]> => {
  const entityId = assertValidEntityId(id)
  const collection = await readCollection(collectionName, projectRoot)
  const entity = collection.find((entry) => entry.id === entityId)

  if (!entity) {
    throw new MasterDataError(
      `${MASTER_COLLECTION_SPECS[collectionName].label.slice(0, -1)} not found`,
      404,
      'missing_entity',
    )
  }

  return entity
}

const getMutableCollection = <Name extends MasterCollectionName>(
  store: LiveDataStore,
  collectionName: Name,
): MasterCollectionEntry<Name>[] => {
  const storeKey = MASTER_COLLECTION_SPECS[collectionName].storeKey as MasterStoreKeyMap[Name]
  return store[storeKey] as MasterCollectionEntry<Name>[]
}

const withCollectionWritten = async <Name extends MasterCollectionName>(
  collectionName: Name,
  mutator: (store: LiveDataStore, collection: MasterCollectionEntry<Name>[]) => void,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name][]> => {
  const store = await readLiveDataStore(projectRoot)
  const collection = getMutableCollection(store, collectionName)
  mutator(store, collection)
  await writeLiveDataStore(store, projectRoot)
  return structuredClone(collection) as MasterEntityMap[Name][]
}

/** Ensures every lot id exists and passes export / lab gate rules before attaching to a trade. */
export const assertTradeLotsExportEligible = (store: LiveDataStore, lotIds: string[]): void => {
  for (const lotId of lotIds) {
    const lot = store.lots.find((entry) => entry.id === lotId)
    if (!lot) {
      throw new MasterDataError(`Lot ${lotId} not found`, 400, 'missing_lot')
    }
    if (!isLotExportEligible(lot)) {
      throw new MasterDataError(
        `Lot ${lot.publicLotCode} is not export eligible until lab approval is recorded`,
        400,
        'lab_export_blocked',
      )
    }
  }
}

const throwDuplicateIfNeeded = <Name extends MasterCollectionName>(
  collectionName: Name,
  candidate: Omit<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<MasterEntityMap[Name], 'id' | 'createdAt' | 'updatedAt'>>,
  collection: MasterEntityMap[Name][],
  existingId?: string,
): void => {
  const duplicateMessage = MASTER_COLLECTION_SPECS[collectionName].findDuplicateError?.(
    candidate,
    collection,
    existingId,
  )

  if (duplicateMessage) {
    throw new MasterDataError(duplicateMessage, 409, 'duplicate_key')
  }
}

export const createEntity = async <Name extends MasterCollectionName>(
  collectionName: Name,
  payload: unknown,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name]> => {
  try {
    const parsed = MASTER_COLLECTION_SPECS[collectionName].parseCreate(payload)
    const timestamp = createTimestamp()
    const entity = {
      ...parsed,
      id: generateEntityId(collectionName),
      createdAt: timestamp,
      updatedAt: timestamp,
    } as MasterEntityMap[Name]

    let createdEntity: MasterEntityMap[Name] | undefined

    await withCollectionWritten(
      collectionName,
      (store, collection) => {
        if (collectionName === 'trades') {
          assertTradeLotsExportEligible(store, (entity as Trade).lotIds)
        }
        throwDuplicateIfNeeded(collectionName, entity, collection as MasterEntityMap[Name][])
        createdEntity = entity
        collection.unshift(entity as MasterCollectionEntry<Name>)
      },
      projectRoot,
    )

    return createdEntity as MasterEntityMap[Name]
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }

    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid payload',
      400,
      'invalid_payload',
    )
  }
}

export const updateEntity = async <Name extends MasterCollectionName>(
  collectionName: Name,
  id: string,
  payload: unknown,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name]> => {
  const entityId = assertValidEntityId(id)

  try {
    const patch = MASTER_COLLECTION_SPECS[collectionName].parseUpdate(payload)
    let updatedEntity: MasterEntityMap[Name] | undefined

    await withCollectionWritten(
      collectionName,
      (store, collection) => {
        const index = collection.findIndex((entry) => entry.id === entityId)
        if (index < 0) {
          throw new MasterDataError(
            `${MASTER_COLLECTION_SPECS[collectionName].label.slice(0, -1)} not found`,
            404,
            'missing_entity',
          )
        }

        const nextEntity = {
          ...collection[index],
          ...patch,
          updatedAt: createTimestamp(),
        } as MasterEntityMap[Name]

        if (collectionName === 'trades') {
          assertTradeLotsExportEligible(store, (nextEntity as Trade).lotIds)
        }

        throwDuplicateIfNeeded(
          collectionName,
          nextEntity,
          collection as MasterEntityMap[Name][],
          entityId,
        )

        collection[index] = nextEntity as MasterCollectionEntry<Name>
        updatedEntity = nextEntity
      },
      projectRoot,
    )

    return updatedEntity as MasterEntityMap[Name]
  } catch (error) {
    if (error instanceof MasterDataError) {
      throw error
    }

    throw new MasterDataError(
      error instanceof Error ? error.message : 'Invalid payload',
      400,
      'invalid_payload',
    )
  }
}

export const deleteEntity = async <Name extends MasterCollectionName>(
  collectionName: Name,
  id: string,
  projectRoot = getLiveDataProjectRoot(),
): Promise<MasterEntityMap[Name]> => {
  const entityId = assertValidEntityId(id)
  let removedEntity: MasterEntityMap[Name] | undefined

  await withCollectionWritten(
    collectionName,
    (_store, collection) => {
      const index = collection.findIndex((entry) => entry.id === entityId)
      if (index < 0) {
        throw new MasterDataError(
          `${MASTER_COLLECTION_SPECS[collectionName].label.slice(0, -1)} not found`,
          404,
          'missing_entity',
        )
      }

      removedEntity = collection[index] as MasterEntityMap[Name]
      collection.splice(index, 1)
    },
    projectRoot,
  )

  return removedEntity as MasterEntityMap[Name]
}

/**
 * Resolves an isolated preview store when `x-ankuaru-preview-id` is set (admin role monitor).
 * Invalid or unknown preview ids throw so callers do not fall back to the real cwd store.
 */
export const resolveProjectRootFromRequest = (request: Request): string => {
  const previewId = request.headers.get('x-ankuaru-preview-id')?.trim()
  if (previewId) {
    const root = getPreviewProjectRoot(previewId)
    if (!root) {
      throw new MasterDataError('Invalid or expired preview session', 404, 'invalid_preview')
    }
    return root
  }

  return request.headers.get('x-ankuaru-project-root') ?? getLiveDataProjectRoot()
}
