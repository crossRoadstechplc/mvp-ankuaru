// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as createField } from '@/app/api/fields/route'
import { DELETE as deleteField, PATCH as patchField } from '@/app/api/fields/[id]/route'
import { GET as getFields } from '@/app/api/fields/route'
import { readLiveDataStore } from '@/lib/persistence/live-data-store'

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

const triangle = [
  { lat: 6.1, lng: 38.1 },
  { lat: 6.2, lng: 38.1 },
  { lat: 6.15, lng: 38.2 },
]

const overlappingTriangle = [
  { lat: 6.1792, lng: 38.2022 },
  { lat: 6.1794, lng: 38.2029 },
  { lat: 6.1787, lng: 38.2027 },
]

describe('fields API', () => {
  it('creates a field via POST and persists it', async () => {
    const projectRoot = await createTempProjectRoot()

    const response = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'API Test Plot',
          polygon: triangle,
          centroid: { lat: 6.15, lng: 38.15 },
          areaSqm: 4000,
        }),
      }),
    )

    expect(response.status).toBe(201)
    const created = (await response.json()) as { id: string; farmerId: string; name: string }
    expect(created.name).toBe('API Test Plot')
    expect(created.farmerId).toBe('user-farmer-001')

    const store = await readLiveDataStore(projectRoot)
    expect(store.fields.some((f) => f.id === created.id)).toBe(true)
  })

  it('rejects create when polygon has fewer than three vertices', async () => {
    const projectRoot = await createTempProjectRoot()

    const response = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'Bad plot',
          polygon: [
            { lat: 1, lng: 2 },
            { lat: 3, lng: 4 },
          ],
        }),
      }),
    )

    expect(response.status).toBe(400)
  })

  it('supports multiple fields for the same farmer', async () => {
    const projectRoot = await createTempProjectRoot()

    const first = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'First',
          polygon: triangle,
        }),
      }),
    )
    const second = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'Second',
          polygon: [
            { lat: 6.0, lng: 38.0 },
            { lat: 6.01, lng: 38.0 },
            { lat: 6.0, lng: 38.01 },
          ],
        }),
      }),
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const list = await getFields(withProjectRoot(projectRoot))
    const fields = (await list.json()) as Array<{ farmerId: string }>
    const forFarmer = fields.filter((f) => f.farmerId === 'user-farmer-001')
    expect(forFarmer.length).toBeGreaterThanOrEqual(2)
  })

  it('updates and deletes a field', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-001',
          name: 'Patch me',
          polygon: triangle,
        }),
      }),
    )
    const created = (await createResponse.json()) as { id: string }

    const patchResponse = await patchField(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Patched name' }),
      }),
      { params: { id: created.id } },
    )
    expect(patchResponse.status).toBe(200)
    const updated = (await patchResponse.json()) as { name: string }
    expect(updated.name).toBe('Patched name')

    const deleteResponse = await deleteField(withProjectRoot(projectRoot, { method: 'DELETE' }), {
      params: { id: created.id },
    })
    expect(deleteResponse.status).toBe(200)

    const store = await readLiveDataStore(projectRoot)
    expect(store.fields.some((f) => f.id === created.id)).toBe(false)
  })

  it('rejects create when polygon overlaps another farmer field', async () => {
    const projectRoot = await createTempProjectRoot()

    const response = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-002',
          name: 'Overlap attempt',
          polygon: overlappingTriangle,
        }),
      }),
    )

    expect(response.status).toBe(409)
    const body = (await response.json()) as { code?: string; error?: string }
    expect(body.code).toBe('field_overlap_conflict')
    expect(body.error).toMatch(/overlaps another farmer field/i)
  })

  it('rejects patch when changing polygon to overlap another farmer field', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createField(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          farmerId: 'user-farmer-002',
          name: 'Safe field',
          polygon: [
            { lat: 6.25, lng: 38.25 },
            { lat: 6.251, lng: 38.251 },
            { lat: 6.249, lng: 38.252 },
          ],
        }),
      }),
    )
    expect(createResponse.status).toBe(201)
    const created = (await createResponse.json()) as { id: string }

    const patchResponse = await patchField(
      withProjectRoot(projectRoot, {
        method: 'PATCH',
        body: JSON.stringify({ polygon: overlappingTriangle }),
      }),
      { params: { id: created.id } },
    )

    expect(patchResponse.status).toBe(409)
    const body = (await patchResponse.json()) as { code?: string }
    expect(body.code).toBe('field_overlap_conflict')
  })
})
