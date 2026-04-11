// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postDispatch } from '@/app/api/transport/dispatch/route'
import { POST as postReceipt } from '@/app/api/transport/receipt/route'
import { recordDispatch } from '@/lib/transport/record-dispatch'
import { recordReceipt } from '@/lib/transport/record-receipt'
import { isInsuredInTransitDisplay } from '@/lib/transport/transport-state'
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

describe('recordDispatch / recordReceipt', () => {
  it('moves custody to transporter on dispatch without changing owner', async () => {
    const projectRoot = await createTempProjectRoot()
    const before = await readLiveDataStore(projectRoot)
    const lot = before.lots.find((l) => l.id === 'lot-green-001')!
    const ownerBefore = { id: lot.ownerId, role: lot.ownerRole }

    const { lot: updated } = await recordDispatch(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
        locationStatus: 'Gate A',
        insuredInTransit: true,
      },
      projectRoot,
    )

    expect(updated.custodianId).toBe('user-transporter-001')
    expect(updated.custodianRole).toBe('transporter')
    expect(updated.status).toBe('IN_TRANSIT')
    expect(updated.ownerId).toBe(ownerBefore.id)
    expect(updated.ownerRole).toBe(ownerBefore.role)

    const store = await readLiveDataStore(projectRoot)
    const ev = store.events[store.events.length - 1]
    expect(ev.type).toBe('DISPATCH')
    expect(ev.metadata?.insuredInTransit).toBe(true)
  })

  it('transfers custody on receipt; owner unchanged', async () => {
    const projectRoot = await createTempProjectRoot()
    await recordDispatch(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
      },
      projectRoot,
    )

    const mid = await readLiveDataStore(projectRoot)
    const lot = mid.lots.find((l) => l.id === 'lot-green-001')!
    const ownerId = lot.ownerId

    const { lot: received } = await recordReceipt(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        nextCustodianId: 'user-exporter-001',
        nextCustodianRole: 'exporter',
      },
      projectRoot,
    )

    expect(received.custodianId).toBe('user-exporter-001')
    expect(received.custodianRole).toBe('exporter')
    expect(received.status).toBe('ACTIVE')
    expect(received.ownerId).toBe(ownerId)

    const store = await readLiveDataStore(projectRoot)
    expect(store.events.some((e) => e.type === 'RECEIPT')).toBe(true)
  })

  it('rejects dispatch when already in transit', async () => {
    const projectRoot = await createTempProjectRoot()
    await recordDispatch(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
      },
      projectRoot,
    )
    await expect(
      recordDispatch(
        {
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          vehicleId: 'vehicle-001',
          driverId: 'driver-001',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'already_in_transit' })
  })

  it('rejects receipt when not in transit', async () => {
    const projectRoot = await createTempProjectRoot()
    await expect(
      recordReceipt(
        {
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          nextCustodianId: 'user-exporter-001',
          nextCustodianRole: 'exporter',
        },
        projectRoot,
      ),
    ).rejects.toMatchObject({ code: 'not_in_transit' })
  })
})

describe('POST /api/transport/*', () => {
  it('POST dispatch returns 201', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await postDispatch(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          vehicleId: 'vehicle-001',
          driverId: 'driver-001',
        }),
      }),
    )
    expect(res.status).toBe(201)
  })

  it('POST receipt returns 201 after dispatch', async () => {
    const projectRoot = await createTempProjectRoot()
    await postDispatch(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          vehicleId: 'vehicle-001',
          driverId: 'driver-001',
        }),
      }),
    )
    const res = await postReceipt(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({
          lotId: 'lot-green-001',
          transporterUserId: 'user-transporter-001',
          nextCustodianId: 'user-exporter-001',
          nextCustodianRole: 'exporter',
        }),
      }),
    )
    expect(res.status).toBe(201)
  })
})

describe('isInsuredInTransitDisplay', () => {
  it('is true only while IN_TRANSIT and last transport event is insured dispatch', async () => {
    const projectRoot = await createTempProjectRoot()
    let store = await readLiveDataStore(projectRoot)
    let lot = store.lots.find((l) => l.id === 'lot-green-001')!
    expect(isInsuredInTransitDisplay(lot, store.events)).toBe(false)

    await recordDispatch(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
        insuredInTransit: true,
      },
      projectRoot,
    )
    store = await readLiveDataStore(projectRoot)
    lot = store.lots.find((l) => l.id === 'lot-green-001')!
    expect(lot.status).toBe('IN_TRANSIT')
    expect(isInsuredInTransitDisplay(lot, store.events)).toBe(true)

    await recordReceipt(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        nextCustodianId: 'user-exporter-001',
        nextCustodianRole: 'exporter',
      },
      projectRoot,
    )
    store = await readLiveDataStore(projectRoot)
    lot = store.lots.find((l) => l.id === 'lot-green-001')!
    expect(isInsuredInTransitDisplay(lot, store.events)).toBe(false)
  })
})

describe('ownership vs custody', () => {
  it('PATCH lot does not run transport; dispatch/receipt document custody chain', async () => {
    const projectRoot = await createTempProjectRoot()
    const initial = await readLiveDataStore(projectRoot)
    const lot0 = initial.lots.find((l) => l.id === 'lot-green-001')!
    const ownerId = lot0.ownerId

    await recordDispatch(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        vehicleId: 'vehicle-001',
        driverId: 'driver-001',
      },
      projectRoot,
    )
    let store = await readLiveDataStore(projectRoot)
    expect(store.lots.find((l) => l.id === 'lot-green-001')?.ownerId).toBe(ownerId)

    await recordReceipt(
      {
        lotId: 'lot-green-001',
        transporterUserId: 'user-transporter-001',
        nextCustodianId: 'user-lab-001',
        nextCustodianRole: 'lab',
      },
      projectRoot,
    )
    store = await readLiveDataStore(projectRoot)
    const lot = store.lots.find((l) => l.id === 'lot-green-001')!
    expect(lot.ownerId).toBe(ownerId)
    expect(lot.custodianId).toBe('user-lab-001')
  })
})
