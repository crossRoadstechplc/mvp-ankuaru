'use client'

import { create } from 'zustand'

import type { Field, Lot } from '@/lib/domain/types'

const CACHE_TTL_MS = 12_000

type LoadOptions = {
  force?: boolean
}

type LiveDataClientState = {
  fields: Field[]
  lots: Lot[]
  fieldsLoading: boolean
  lotsLoading: boolean
  fieldsError: string | null
  lotsError: string | null
  fieldsLoadedAt: number | null
  lotsLoadedAt: number | null
  loadFields: (options?: LoadOptions) => Promise<Field[]>
  loadLots: (options?: LoadOptions) => Promise<Lot[]>
  loadAll: (options?: LoadOptions) => Promise<void>
}

const shouldSkipReload = (loadedAt: number | null, force?: boolean): boolean => {
  if (force) {
    return false
  }
  if (!loadedAt) {
    return false
  }
  return Date.now() - loadedAt < CACHE_TTL_MS
}

const fetchJson = async <T,>(input: RequestInfo): Promise<T> => {
  const response = await fetch(input, { cache: 'no-store' })
  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  return data as T
}

export const useLiveDataClientStore = create<LiveDataClientState>((set, get) => ({
  fields: [],
  lots: [],
  fieldsLoading: false,
  lotsLoading: false,
  fieldsError: null,
  lotsError: null,
  fieldsLoadedAt: null,
  lotsLoadedAt: null,
  loadFields: async (options) => {
    const state = get()
    if (shouldSkipReload(state.fieldsLoadedAt, options?.force)) {
      return state.fields
    }
    set({ fieldsLoading: true, fieldsError: null })
    try {
      const rows = await fetchJson<Field[]>('/api/fields')
      set({ fields: rows, fieldsLoadedAt: Date.now() })
      return rows
    } catch (error) {
      set({ fieldsError: error instanceof Error ? error.message : 'Failed to load fields' })
      return get().fields
    } finally {
      set({ fieldsLoading: false })
    }
  },
  loadLots: async (options) => {
    const state = get()
    if (shouldSkipReload(state.lotsLoadedAt, options?.force)) {
      return state.lots
    }
    set({ lotsLoading: true, lotsError: null })
    try {
      const rows = await fetchJson<Lot[]>('/api/lots')
      set({ lots: rows, lotsLoadedAt: Date.now() })
      return rows
    } catch (error) {
      set({ lotsError: error instanceof Error ? error.message : 'Failed to load lots' })
      return get().lots
    } finally {
      set({ lotsLoading: false })
    }
  },
  loadAll: async (options) => {
    await Promise.all([get().loadFields(options), get().loadLots(options)])
  },
}))
