import { NextResponse } from 'next/server'

import {
  createEntity,
  deleteEntity,
  MasterDataError,
  readCollection,
  readEntityById,
  resolveProjectRootFromRequest,
  updateEntity,
} from './crud'
import { assertLotLineagePatchAllowed } from './lot-patch-policy'
import type { MasterCollectionName } from './validation'

type RouteContext = {
  params: Promise<{ id: string }> | { id: string }
}

const toErrorResponse = (error: unknown) => {
  if (error instanceof MasterDataError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    )
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'Unexpected error',
      code: 'internal_error',
    },
    { status: 500 },
  )
}

const resolveIdFromContext = async (context: RouteContext): Promise<string> => {
  const params = await context.params
  return params.id
}

export const handleCollectionGet = async (request: Request, collectionName: MasterCollectionName) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const items = await readCollection(collectionName, projectRoot)
    return NextResponse.json(items)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const handleCollectionPost = async (request: Request, collectionName: MasterCollectionName) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const payload: unknown = await request.json()
    const item = await createEntity(collectionName, payload, projectRoot)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const handleItemGet = async (
  request: Request,
  context: RouteContext,
  collectionName: MasterCollectionName,
) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const item = await readEntityById(collectionName, await resolveIdFromContext(context), projectRoot)
    return NextResponse.json(item)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const handleItemPatch = async (
  request: Request,
  context: RouteContext,
  collectionName: MasterCollectionName,
) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const payload: unknown = await request.json()
    if (collectionName === 'lots') {
      assertLotLineagePatchAllowed(request, payload)
    }
    const item = await updateEntity(
      collectionName,
      await resolveIdFromContext(context),
      payload,
      projectRoot,
    )
    return NextResponse.json(item)
  } catch (error) {
    return toErrorResponse(error)
  }
}

export const handleItemDelete = async (
  request: Request,
  context: RouteContext,
  collectionName: MasterCollectionName,
) => {
  try {
    const projectRoot = resolveProjectRootFromRequest(request)
    const item = await deleteEntity(collectionName, await resolveIdFromContext(context), projectRoot)
    return NextResponse.json(item)
  } catch (error) {
    return toErrorResponse(error)
  }
}
