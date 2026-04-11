// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { GET as getEvent, PATCH as patchEvent, DELETE as deleteEvent } from '@/app/api/events/[id]/route'
import { GET as getEvents, POST as createEvent } from '@/app/api/events/route'
import { appendEvent } from '@/lib/events/ledger'
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

describe('event ledger API', () => {
  it('appends events safely to the end of the ledger', async () => {
    const projectRoot = await createTempProjectRoot()
    const before = await readLiveDataStore(projectRoot)

    const event = await appendEvent(
      {
        type: 'DISPATCH',
        actorId: 'user-transporter-001',
        actorRole: 'transporter',
        inputLotIds: ['lot-green-001'],
        outputLotIds: ['lot-green-001'],
        inputQty: 980,
        outputQty: 980,
        metadata: {
          vehicleId: 'vehicle-001',
        },
      },
      projectRoot,
    )

    const after = await readLiveDataStore(projectRoot)

    expect(after.events).toHaveLength(before.events.length + 1)
    expect(after.events.at(-1)?.id).toBe(event.id)
    expect(after.events.at(-1)?.type).toBe('DISPATCH')
  })

  it('supports GET all, GET by id, and POST create for events', async () => {
    const projectRoot = await createTempProjectRoot()

    const createResponse = await createEvent(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          type: 'RECEIPT',
          actorId: 'user-exporter-001',
          actorRole: 'exporter',
          inputLotIds: ['lot-green-001'],
          outputLotIds: ['lot-green-001'],
          metadata: {
            warehouse: 'Addis bonded storage',
          },
        }),
      }),
    )
    const createdEvent = (await createResponse.json()) as { id: string; type: string }

    expect(createResponse.status).toBe(201)
    expect(createdEvent.type).toBe('RECEIPT')

    const listResponse = await getEvents(withProjectRoot(projectRoot))
    const events = (await listResponse.json()) as Array<{ id: string }>
    expect(events.some((event) => event.id === createdEvent.id)).toBe(true)

    const readResponse = await getEvent(withProjectRoot(projectRoot), {
      params: { id: createdEvent.id },
    })
    const fetchedEvent = (await readResponse.json()) as { id: string; type: string }

    expect(readResponse.status).toBe(200)
    expect(fetchedEvent.id).toBe(createdEvent.id)
  })

  it('rejects update and delete operations for events', async () => {
    const patchResponse = await patchEvent()
    const patchBody = (await patchResponse.json()) as { code: string }
    expect(patchResponse.status).toBe(405)
    expect(patchBody.code).toBe('method_not_allowed')

    const deleteResponse = await deleteEvent()
    const deleteBody = (await deleteResponse.json()) as { code: string }
    expect(deleteResponse.status).toBe(405)
    expect(deleteBody.code).toBe('method_not_allowed')
  })
})
