// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { POST as postIntegrityRun } from '@/app/api/integrity/run/route'
import { cloneSeedData } from '@/data/seed-data'
import { runIntegrityEngine } from '@/lib/integrity/run-engine'
import { readLiveDataStore, writeLiveDataStore } from '@/lib/persistence/live-data-store'
import { compareSnapshotLineageToEvents } from '@/lib/traceability/lineage-policy'

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

describe('integrity quarantine application', () => {
  it('flags compromised lots and sets quarantine on apply', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    const process = store.events.find((e) => e.type === 'PROCESS')
    expect(process).toBeDefined()
    if (process && process.outputQty !== undefined) {
      process.outputQty -= 100
    }
    await writeLiveDataStore(store, projectRoot)

    const result = await runIntegrityEngine(projectRoot, { apply: true })
    expect([...result.evaluation.issuesByLotId.values()].some((issues) => issues.length > 0)).toBe(true)
    expect(result.updatedLots.length).toBeGreaterThan(0)

    const after = await readLiveDataStore(projectRoot)
    const cherry = after.lots.find((l) => l.id === 'lot-cherry-001')
    expect(cherry?.integrityStatus).toBe('COMPROMISED')
    expect(cherry?.status).toBe('QUARANTINED')
    expect(cherry?.quarantineReason).toMatch(/MASS_IMBALANCE/)
    expect(after.events.some((e) => e.type === 'INTEGRITY_FLAGGED')).toBe(true)
  })

  it('repairs lineage snapshot drift from the ledger before evaluation when apply is true', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    const idx = store.lots.findIndex((l) => l.id === 'lot-cherry-001')
    expect(idx).toBeGreaterThanOrEqual(0)
    store.lots[idx] = { ...store.lots[idx], parentLotIds: ['tampered-parent'] }
    await writeLiveDataStore(store, projectRoot)

    await runIntegrityEngine(projectRoot, { apply: true })
    const after = await readLiveDataStore(projectRoot)
    const lot = after.lots.find((l) => l.id === 'lot-cherry-001')
    expect(lot).toBeDefined()
    expect(compareSnapshotLineageToEvents(lot!, after.events)).toBeNull()
  })

  it('dry run does not write quarantine', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = await readLiveDataStore(projectRoot)
    const process = store.events.find((e) => e.type === 'PROCESS')
    if (process && process.outputQty !== undefined) {
      process.outputQty -= 10
    }
    await writeLiveDataStore(store, projectRoot)

    await runIntegrityEngine(projectRoot, { apply: false })
    const mid = await readLiveDataStore(projectRoot)
    expect(mid.lots.find((l) => l.id === 'lot-cherry-001')?.integrityStatus).toBe('OK')
  })

  it('POST /api/integrity/run returns issue map', async () => {
    const projectRoot = await createTempProjectRoot()
    const store = cloneSeedData()
    const process = store.events.find((e) => e.type === 'PROCESS')
    if (process && process.outputQty !== undefined) {
      process.outputQty -= 5
    }
    await writeLiveDataStore(store, projectRoot)

    const res = await postIntegrityRun(
      withProjectRoot(projectRoot, {
        method: 'POST',
        body: JSON.stringify({ apply: true }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { issueCount: number; issuesByLotId: Record<string, unknown> }
    expect(body.issueCount).toBeGreaterThan(0)
    expect(Object.keys(body.issuesByLotId).length).toBeGreaterThan(0)
  })
})
