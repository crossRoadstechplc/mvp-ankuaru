import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAdminPreviewKey, isValidAdminPreviewKey } from '@/lib/admin/preview-auth'
import { DEFAULT_ADMIN_PREVIEW_KEY } from '@/lib/admin/preview-constants'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('preview auth helpers', () => {
  it('validates admin key against default', () => {
    expect(isValidAdminPreviewKey(DEFAULT_ADMIN_PREVIEW_KEY)).toBe(true)
    expect(isValidAdminPreviewKey('wrong')).toBe(false)
    expect(isValidAdminPreviewKey('')).toBe(false)
  })

  it('uses env override when set', () => {
    vi.stubEnv('ANKUARU_ADMIN_PREVIEW_KEY', 'secret-from-env')
    expect(getAdminPreviewKey()).toBe('secret-from-env')
    expect(isValidAdminPreviewKey('secret-from-env')).toBe(true)
    expect(isValidAdminPreviewKey(DEFAULT_ADMIN_PREVIEW_KEY)).toBe(false)
    vi.unstubAllEnvs()
  })
})
