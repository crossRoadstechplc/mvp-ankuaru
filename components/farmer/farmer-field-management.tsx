'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { Field } from '@/lib/domain/types'
import { buildFieldGeometryPayload } from '@/lib/fields/geometry'
import { useUiStore } from '@/store/ui-store'

import { FieldMapEditorDynamic } from './field-map-editor-dynamic'
import { FarmerFieldList } from './farmer-field-list'

type GeometryDraft = {
  polygon: Field['polygon']
  centroid: NonNullable<Field['centroid']>
  areaSqm: number
}

const fetchJson = async (input: RequestInfo, init?: RequestInit) => {
  const response = await fetch(input, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const data: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${response.status})`
    throw new Error(message)
  }

  return data
}

export function FarmerFieldManagement() {
  const searchParams = useSearchParams()
  const selectedRole = useUiStore((s) => s.selectedRole)
  const selectedUserId = useUiStore((s) => s.selectedUserId)

  const farmerUserId = useMemo(() => {
    const queryId = searchParams.get('farmerId')
    if (queryId) {
      return queryId
    }
    if (selectedRole === 'farmer' && selectedUserId) {
      return selectedUserId
    }
    return 'user-farmer-001'
  }, [searchParams, selectedRole, selectedUserId])

  const [allFields, setAllFields] = useState<Field[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)
  const [newSession, setNewSession] = useState(0)
  const [fieldName, setFieldName] = useState('')
  const [draftGeometry, setDraftGeometry] = useState<GeometryDraft | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const farmerFields = useMemo(
    () => allFields.filter((field) => field.farmerId === farmerUserId),
    [allFields, farmerUserId],
  )

  const activeField = useMemo(
    () => (activeFieldId ? allFields.find((f) => f.id === activeFieldId) ?? null : null),
    [activeFieldId, allFields],
  )

  const mapSessionKey = activeFieldId ?? `new-${newSession}`

  const initialMapPolygon = activeField?.polygon ?? null

  const loadFields = useCallback(async () => {
    setLoadError(null)
    setLoading(true)
    try {
      const data = (await fetchJson('/api/fields')) as Field[]
      setAllFields(data)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load fields')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFields()
  }, [loadFields])

  const resetToNew = () => {
    setActiveFieldId(null)
    setNewSession((n) => n + 1)
    setFieldName('')
    setDraftGeometry(null)
    setFormError(null)
  }

  const handleEdit = (field: Field) => {
    setActiveFieldId(field.id)
    setFieldName(field.name)
    const geo = buildFieldGeometryPayload(field.polygon)
    setDraftGeometry({
      polygon: geo.polygon,
      centroid: geo.centroid!,
      areaSqm: geo.areaSqm!,
    })
    setFormError(null)
  }

  const handleGeometryChange = useCallback((payload: GeometryDraft | null) => {
    setDraftGeometry(payload)
    setFormError(null)
  }, [])

  const handleDelete = async (field: Field) => {
    const ok = window.confirm(`Delete field “${field.name}”? This cannot be undone.`)
    if (!ok) {
      return
    }

    setFormError(null)
    try {
      await fetchJson(`/api/fields/${field.id}`, { method: 'DELETE' })
      if (activeFieldId === field.id) {
        resetToNew()
      }
      await loadFields()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  const handleSave = async () => {
    setFormError(null)
    const name = fieldName.trim()
    if (name.length === 0) {
      setFormError('Field name is required.')
      return
    }
    if (!draftGeometry || draftGeometry.polygon.length < 3) {
      setFormError('Draw a polygon with at least three vertices on the map.')
      return
    }

    setSaving(true)
    try {
      const body = {
        farmerId: farmerUserId,
        name,
        polygon: draftGeometry.polygon,
        centroid: draftGeometry.centroid,
        areaSqm: draftGeometry.areaSqm,
      }

      if (activeFieldId) {
        await fetchJson(`/api/fields/${activeFieldId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        })
      } else {
        await fetchJson('/api/fields', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      }

      await loadFields()
      resetToNew()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">Farmer · Stage 05</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Field management</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Draw field boundaries on the map, keep plots tied to <span className="font-mono text-slate-800">farmerId</span>, and
            persist everything through the fields API. The map starts at your current location when the browser allows it.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Managing fields for farmer user id:{' '}
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-900">{farmerUserId}</span>
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          Back to dashboard
        </Link>
      </header>

      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Summary</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Your plots</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-xs text-slate-500">Fields</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{farmerFields.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <p className="text-xs text-slate-500">Total vertices</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {farmerFields.reduce((sum, f) => sum + f.polygon.length, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-600">Loading fields…</p>
          ) : loadError ? (
            <p className="text-sm text-red-700">{loadError}</p>
          ) : (
            <FarmerFieldList
              fields={farmerFields}
              onEdit={handleEdit}
              onDelete={(field) => {
                void handleDelete(field)
              }}
            />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
              {activeFieldId ? 'Edit field' : 'Create field'}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950">Map & form</h2>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800"
            onClick={() => resetToNew()}
          >
            New field
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <FieldMapEditorDynamic
              mapSessionKey={mapSessionKey}
              initialPolygon={initialMapPolygon}
              onGeometryChange={handleGeometryChange}
            />
            <p className="text-xs leading-5 text-slate-500">
              Use the polygon tool on the right side of the map to draw. Use edit (shape icon) and delete tools to adjust. Only
              one polygon per field is kept.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">
              Field name
              <input
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900"
                value={fieldName}
                onChange={(e) => setFieldName(e.target.value)}
                placeholder="e.g. Konga East Plot"
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              farmerId (user id)
              <input
                className="mt-2 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 font-mono text-sm text-slate-700"
                value={farmerUserId}
                readOnly
              />
            </label>

            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Computed geometry</p>
              <p className="mt-2">
                Area:{' '}
                <span className="font-semibold text-slate-900">
                  {draftGeometry ? `${draftGeometry.areaSqm.toLocaleString()} m²` : '—'}
                </span>
              </p>
              <p className="mt-1">
                Centroid:{' '}
                <span className="font-mono text-xs text-slate-900">
                  {draftGeometry
                    ? `${draftGeometry.centroid.lat.toFixed(6)}, ${draftGeometry.centroid.lng.toFixed(6)}`
                    : '—'}
                </span>
              </p>
            </div>

            {formError ? <p className="text-sm text-red-700">{formError}</p> : null}

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : activeFieldId ? 'Save changes' : 'Save field'}
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
