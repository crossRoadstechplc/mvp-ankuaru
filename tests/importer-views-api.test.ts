// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'

import { GET as getAuthorizedLots } from '@/app/api/views/importer/authorized-lots/route'
import { GET as getLotAccess } from '@/app/api/views/importer/lot-access/route'

import { cleanupTempProjectRoots, createTempProjectRoot } from './helpers/temp-project'

afterEach(async () => {
  await cleanupTempProjectRoots()
})

const req = (projectRoot: string, path: string) =>
  new Request(`http://localhost${path}`, {
    headers: { 'x-ankuaru-project-root': projectRoot },
  })

describe('importer view APIs', () => {
  it('returns authorized lot ids for buyer', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await getAuthorizedLots(req(projectRoot, '/api/views/importer/authorized-lots?buyerUserId=user-importer-001'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { lotIds: string[] }
    expect(body.lotIds).toContain('lot-green-001')
  })

  it('returns 400 without buyerUserId', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await getAuthorizedLots(req(projectRoot, '/api/views/importer/authorized-lots'))
    expect(res.status).toBe(400)
  })

  it('lot-access reports allowed for buyer-linked lot', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await getLotAccess(
      req(
        projectRoot,
        '/api/views/importer/lot-access?lotId=lot-green-001&buyerUserId=user-importer-001',
      ),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { allowed: boolean }
    expect(body.allowed).toBe(true)
  })

  it('lot-access reports disallowed for non-linked lot', async () => {
    const projectRoot = await createTempProjectRoot()
    const res = await getLotAccess(
      req(
        projectRoot,
        '/api/views/importer/lot-access?lotId=lot-cherry-001&buyerUserId=user-importer-001',
      ),
    )
    const body = (await res.json()) as { allowed: boolean }
    expect(body.allowed).toBe(false)
  })
})
