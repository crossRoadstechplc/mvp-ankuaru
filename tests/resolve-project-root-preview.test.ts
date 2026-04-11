// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { MasterDataError, resolveProjectRootFromRequest } from '@/lib/master-data/crud'
import { __clearPreviewSessionsForTest, __registerPreviewSessionForTest } from '@/lib/admin/preview-sessions'

describe('resolveProjectRootFromRequest + preview namespace', () => {
  it('resolves registered preview id to mapped root', () => {
    __registerPreviewSessionForTest('pv-unit', '__PREVIEW_ROOT_TEST__')
    try {
      const root = resolveProjectRootFromRequest(
        new Request('http://x', { headers: { 'x-ankuaru-preview-id': 'pv-unit' } }),
      )
      expect(root).toBe('__PREVIEW_ROOT_TEST__')
    } finally {
      __clearPreviewSessionsForTest()
    }
  })

  it('throws MasterDataError when preview id is unknown', () => {
    expect(() =>
      resolveProjectRootFromRequest(
        new Request('http://x', { headers: { 'x-ankuaru-preview-id': 'pv-missing' } }),
      ),
    ).toThrow(MasterDataError)
  })
})
