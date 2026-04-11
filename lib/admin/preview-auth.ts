import { DEFAULT_ADMIN_PREVIEW_KEY } from '@/lib/admin/preview-constants'

/**
 * Dev / internal gate for admin preview session APIs (no real auth layer in MVP).
 * Set ANKUARU_ADMIN_PREVIEW_KEY in production; tests use the same default as the server.
 */
export const getAdminPreviewKey = (): string => process.env.ANKUARU_ADMIN_PREVIEW_KEY ?? DEFAULT_ADMIN_PREVIEW_KEY

export const isValidAdminPreviewKey = (key: string | undefined | null): boolean =>
  typeof key === 'string' && key.length > 0 && key === getAdminPreviewKey()
