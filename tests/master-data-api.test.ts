// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createField } from '@/app/api/fields/route'
import {
  DELETE as deleteField,
  GET as getField,
  PATCH as patchField,
} from '@/app/api/fields/[id]/route'
import { GET as getFields } from '@/app/api/fields/route'
import { POST as createLot } from '@/app/api/lots/route'
import {
  DELETE as deleteLot,
  GET as getLot,
  PATCH as patchLot,
} from '@/app/api/lots/[id]/route'
import { GET as getLots } from '@/app/api/lots/route'
import { POST as createUser, GET as getUsers } from '@/app/api/users/route'
import {
  DELETE as deleteUser,
  GET as getUser,
  PATCH as patchUser,
} from '@/app/api/users/[id]/route'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

import { withProjectRoot as withProjectRootAndSession } from './helpers/api-request'
import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const withProjectRoot = (projectRoot: string, init?: RequestInit) =>
  new Request('http://localhost', {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-ankuaru-project-root': projectRoot,
      ...(init?.headers ?? {}),
    },
  })

describe('master data CRUD API routes', () => {
  it('supports create, read, update, delete for users', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createUser(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Stage Two Admin',
          email: 'stage-two-admin@ankuaru.test',
          role: 'admin',
          isActive: true,
        }),
      }),
    )
    const createdUser = (await createResponse.json()) as { id: string; role: string; name: string }

    expect(createResponse.status).toBe(201)
    expect(createdUser.name).toBe('Stage Two Admin')

    const listResponse = await getUsers(withProjectRoot(projectRoot))
    const users = (await listResponse.json()) as Array<{ id: string }>
    expect(users.some((user) => user.id === createdUser.id)).toBe(true)

    const readResponse = await getUser(withProjectRoot(projectRoot), {
      params: { id: createdUser.id },
    })
    expect(readResponse.status).toBe(200)

    const patchResponse = await patchUser(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({
          role: 'regulator',
          isActive: false,
        }),
      }),
      { params: { id: createdUser.id } },
    )
    const updatedUser = (await patchResponse.json()) as { role: string; isActive: boolean }
    expect(updatedUser.role).toBe('regulator')
    expect(updatedUser.isActive).toBe(false)

    const deleteResponse = await deleteUser(withProjectRoot(projectRoot, { method: 'DELETE' }), {
      params: { id: createdUser.id },
    })
    expect(deleteResponse.status).toBe(200)

    const store = await readLiveDataStore(projectRoot)
    expect(store.users.some((user) => user.id === createdUser.id)).toBe(false)
  })

  it('supports create, read, update, delete for fields', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'Stage Two Plot',
          polygon: [
            { lat: 6.1791, lng: 38.2024 },
            { lat: 6.1793, lng: 38.2024 },
            { lat: 6.1793, lng: 38.2027 },
            { lat: 6.1791, lng: 38.2027 },
          ],
          centroid: { lat: 6.1792, lng: 38.20255 },
          areaSqm: 1200,
        }),
      }),
    )
    const createdField = (await createResponse.json()) as { id: string; name: string }
    expect(createResponse.status).toBe(201)
    expect(createdField.name).toBe('Stage Two Plot')

    const listResponse = await getFields(withProjectRoot(projectRoot))
    const fields = (await listResponse.json()) as Array<{ id: string }>
    expect(fields.some((field) => field.id === createdField.id)).toBe(true)

    const readResponse = await getField(withProjectRoot(projectRoot), {
      params: { id: createdField.id },
    })
    expect(readResponse.status).toBe(200)

    const patchResponse = await patchField(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({
          name: 'Stage Two Plot Updated',
          areaSqm: 1500,
        }),
      }),
      { params: { id: createdField.id } },
    )
    const updatedField = (await patchResponse.json()) as { name: string; areaSqm: number }
    expect(updatedField.name).toBe('Stage Two Plot Updated')
    expect(updatedField.areaSqm).toBe(1500)

    const deleteResponse = await deleteField(withProjectRoot(projectRoot, { method: 'DELETE' }), {
      params: { id: createdField.id },
    })
    expect(deleteResponse.status).toBe(200)

    const store = await readLiveDataStore(projectRoot)
    expect(store.fields.some((field) => field.id === createdField.id)).toBe(false)
  })

  it('supports create, read, update, delete for lots', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createLot(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          publicLotCode: 'ANK-LOT-GR-NEW-01',
          internalUuid: '44444444-4444-4444-8444-444444444444',
          traceKey: 'TRACE-NEW-LOT-01',
          fieldId: 'field-001',
          farmerId: 'user-farmer-001',
          farmId: 'farmer-profile-001',
          form: 'GREEN',
          weight: 700,
          ownerId: 'user-exporter-001',
          ownerRole: 'exporter',
          custodianId: 'user-exporter-001',
          custodianRole: 'exporter',
          parentLotIds: [],
          childLotIds: [],
          status: 'ACTIVE',
          labStatus: 'NOT_REQUIRED',
          isCollateral: false,
          integrityStatus: 'OK',
        }),
      }),
    )
    const createdLot = (await createResponse.json()) as { id: string; publicLotCode: string }
    expect(createResponse.status).toBe(201)
    expect(createdLot.publicLotCode).toBe('ANK-LOT-GR-NEW-01')

    const listResponse = await getLots(withProjectRoot(projectRoot))
    const lots = (await listResponse.json()) as Array<{ id: string }>
    expect(lots.some((lot) => lot.id === createdLot.id)).toBe(true)

    const readResponse = await getLot(withProjectRoot(projectRoot), {
      params: { id: createdLot.id },
    })
    expect(readResponse.status).toBe(200)

    const patchResponse = await patchLot(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({
          weight: 760,
          status: 'READY_FOR_EXPORT',
          isCollateral: true,
          collateralHolderId: 'user-bank-001',
        }),
      }),
      { params: { id: createdLot.id } },
    )
    const updatedLot = (await patchResponse.json()) as {
      weight: number
      status: string
      isCollateral: boolean
    }
    expect(updatedLot.weight).toBe(760)
    expect(updatedLot.status).toBe('READY_FOR_EXPORT')
    expect(updatedLot.isCollateral).toBe(true)

    const deleteResponse = await deleteLot(withProjectRoot(projectRoot, { method: 'DELETE' }), {
      params: { id: createdLot.id },
    })
    expect(deleteResponse.status).toBe(200)

    const store = await readLiveDataStore(projectRoot)
    expect(store.lots.some((lot) => lot.id === createdLot.id)).toBe(false)
  })

  it('rejects PATCH on lots that touch parentLotIds or childLotIds without admin mock session', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await patchLot(
      withProjectRootAndSession(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ parentLotIds: [] }),
      }),
      { params: { id: 'lot-green-001' } },
    )
    expect(res.status).toBe(403)
    const body = (await res.json()) as { code: string }
    expect(body.code).toBe('forbidden_lineage_patch')
  })

  it('allows PATCH on lots lineage snapshot fields when mock session is admin', async () => {
    const projectRoot = await createTempProjectRoot()
    const storeBefore = await readLiveDataStore(projectRoot)
    const target = storeBefore.lots.find((l) => l.id === 'lot-green-001')
    expect(target).toBeDefined()

    const res = await patchLot(
      withProjectRootAndSession(
        projectRoot,
        {
          method: 'PATCH',
          body: JSON.stringify({
            parentLotIds: target!.parentLotIds,
            childLotIds: target!.childLotIds,
          }),
        },
        { userId: 'user-admin-001', role: 'admin' },
      ),
      { params: { id: 'lot-green-001' } },
    )
    expect(res.status).toBe(200)
  })

  it('returns clear validation errors for invalid payloads, invalid ids, missing entities, and duplicates', async () => {
    const projectRoot = await createTempProjectRoot()

    const invalidUserResponse = await createUser(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          email: 'missing-name@ankuaru.test',
          role: 'admin',
          isActive: true,
        }),
      }),
    )
    const invalidUserBody = (await invalidUserResponse.json()) as { code: string }
    expect(invalidUserResponse.status).toBe(400)
    expect(invalidUserBody.code).toBe('invalid_payload')

    const duplicateLotResponse = await createLot(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          publicLotCode: 'ANK-LOT-GR-001',
          internalUuid: '55555555-5555-4555-8555-555555555555',
          traceKey: 'TRACE-DUPLICATE-LOT',
          form: 'GREEN',
          weight: 500,
          ownerId: 'user-exporter-001',
          ownerRole: 'exporter',
          custodianId: 'user-exporter-001',
          custodianRole: 'exporter',
          parentLotIds: [],
          childLotIds: [],
          status: 'ACTIVE',
          labStatus: 'NOT_REQUIRED',
          isCollateral: false,
          integrityStatus: 'OK',
        }),
      }),
    )
    const duplicateLotBody = (await duplicateLotResponse.json()) as { code: string }
    expect(duplicateLotResponse.status).toBe(409)
    expect(duplicateLotBody.code).toBe('duplicate_key')

    const invalidIdResponse = await getUser(withProjectRoot(projectRoot), {
      params: { id: '   ' },
    })
    const invalidIdBody = (await invalidIdResponse.json()) as { code: string }
    expect(invalidIdResponse.status).toBe(400)
    expect(invalidIdBody.code).toBe('invalid_id')

    const missingUserResponse = await deleteUser(withProjectRoot(projectRoot, { method: 'DELETE' }), {
      params: { id: 'user-does-not-exist' },
    })
    const missingUserBody = (await missingUserResponse.json()) as { code: string }
    expect(missingUserResponse.status).toBe(404)
    expect(missingUserBody.code).toBe('missing_entity')
  })
})
