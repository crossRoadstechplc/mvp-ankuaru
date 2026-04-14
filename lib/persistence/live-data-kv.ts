import { createClient, type VercelKV } from '@vercel/kv'

import { cloneSeedData } from '@/data/seed-data'
import { parseLiveDataStore } from '@/lib/domain/validation'
import type { LiveDataStore } from '@/lib/domain/types'

/** Single blob for the default (canonical) project root — shared across all serverless instances. */
const KV_LIVE_DATA_KEY = 'ankuaru:live-data:v1'

let kvClient: VercelKV | null | undefined

/**
 * Vercel’s legacy “KV” product is gone; Upstash Redis is wired via Marketplace and usually exposes
 * `UPSTASH_REDIS_REST_*`. Older integrations still set `KV_REST_API_*` — support both.
 */
const getRedisRestCredentials = (): { url: string; token: string } | null => {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_URL?.trim()
  const token =
    process.env.KV_REST_API_TOKEN?.trim() || process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) {
    return null
  }
  return { url, token }
}

export const isKvLiveDataConfigured = (): boolean => getRedisRestCredentials() !== null

const getKvClient = (): VercelKV | null => {
  if (kvClient !== undefined) {
    return kvClient
  }
  const creds = getRedisRestCredentials()
  if (!creds) {
    kvClient = null
    return null
  }
  kvClient = createClient({
    url: creds.url,
    token: creds.token,
  })
  return kvClient
}

const readLiveDataFromKv = async (): Promise<LiveDataStore | null> => {
  const kv = getKvClient()
  if (!kv) {
    return null
  }
  const raw = await kv.get<unknown>(KV_LIVE_DATA_KEY)
  if (raw == null) {
    return null
  }
  return parseLiveDataStore(raw)
}

export const writeLiveDataToKv = async (value: LiveDataStore): Promise<LiveDataStore> => {
  const kv = getKvClient()
  if (!kv) {
    throw new Error(
      'Shared Redis is not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN).',
    )
  }
  const parsed = parseLiveDataStore(value)
  await kv.set(KV_LIVE_DATA_KEY, parsed)
  return structuredClone(parsed)
}

export const seedKvLiveDataIfEmpty = async (): Promise<LiveDataStore> => {
  const existing = await readLiveDataFromKv()
  if (existing) {
    return structuredClone(existing)
  }
  const seed = parseLiveDataStore(cloneSeedData())
  return writeLiveDataToKv(seed)
}
