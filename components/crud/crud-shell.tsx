'use client'

import { startTransition, useMemo, useState } from 'react'

import { showAppToast } from '@/lib/client/app-toast'

type CrudFieldOption = {
  label: string
  value: string
}

export type CrudFieldConfig = {
  name: string
  label: string
  type: 'text' | 'email' | 'number' | 'checkbox' | 'select' | 'textarea'
  required?: boolean
  placeholder?: string
  options?: CrudFieldOption[]
  rows?: number
}

type CrudFormValues = Record<string, string | boolean>

type CrudEntityShellProps<T extends { id: string }> = {
  title: string
  description: string
  apiBasePath: string
  items: T[]
  fields: CrudFieldConfig[]
  createValues: () => CrudFormValues
  toFormValues: (item: T) => CrudFormValues
  fromFormValues: (values: CrudFormValues) => unknown
  getItemTitle: (item: T) => string
  getItemSubtitle?: (item: T) => string | undefined
  renderDetails: (item: T) => React.ReactNode
}

const toErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string }
    return payload.error ?? `Request failed with status ${response.status}`
  } catch {
    return `Request failed with status ${response.status}`
  }
}

export function CrudShell<T extends { id: string }>({
  title,
  description,
  apiBasePath,
  items: initialItems,
  fields,
  createValues,
  toFormValues,
  fromFormValues,
  getItemTitle,
  getItemSubtitle,
  renderDetails,
}: CrudEntityShellProps<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [expandedId, setExpandedId] = useState<string | null>(initialItems[0]?.id ?? null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [formValues, setFormValues] = useState<CrudFormValues>(createValues)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeId),
    [activeId, items],
  )

  const openCreate = () => {
    setMode('create')
    setActiveId(null)
    setFormValues(createValues())
    setErrorMessage(null)
  }

  const openEdit = (item: T) => {
    setMode('edit')
    setActiveId(item.id)
    setFormValues(toFormValues(item))
    setErrorMessage(null)
  }

  const updateValue = (name: string, value: string | boolean) => {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    const method = mode === 'create' ? 'POST' : 'PATCH'
    const url = mode === 'create' || !activeId ? apiBasePath : `${apiBasePath}/${activeId}`

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(fromFormValues(formValues)),
      })

      if (!response.ok) {
        throw new Error(await toErrorMessage(response))
      }

      const nextItem = (await response.json()) as T

      startTransition(() => {
        setItems((current) => {
          if (mode === 'create') {
            return [nextItem, ...current]
          }

          return current.map((item) => (item.id === nextItem.id ? nextItem : item))
        })
        setExpandedId(nextItem.id)
        openEdit(nextItem)
      })
      showAppToast(mode === 'create' ? 'Record created.' : 'Changes saved.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (item: T) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`${apiBasePath}/${item.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(await toErrorMessage(response))
      }

      startTransition(() => {
        setItems((current) => current.filter((entry) => entry.id !== item.id))
        if (activeId === item.id) {
          openCreate()
        }
        if (expandedId === item.id) {
          setExpandedId(null)
        }
      })
      showAppToast('Record deleted.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-4">
        <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                Admin CRUD
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
              onClick={openCreate}
            >
              Create new
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/70 p-8 text-sm text-slate-600">
            No records yet. Use the create form to add the first item.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const isExpanded = expandedId === item.id
              return (
                <article
                  key={item.id}
                  className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm shadow-black/5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-950">{getItemTitle(item)}</h2>
                      {getItemSubtitle ? (
                        <p className="mt-1 text-sm text-slate-600">{getItemSubtitle(item)}</p>
                      ) : null}
                      <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.id}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      >
                        {isExpanded ? 'Hide details' : 'Show details'}
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700"
                        onClick={() => handleDelete(item)}
                        disabled={isSubmitting}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isExpanded ? <div className="mt-5">{renderDetails(item)}</div> : null}
                </article>
              )
            })}
          </div>
        )}
      </section>

      <aside className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
          {mode === 'create' ? 'Create form' : 'Edit form'}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          {mode === 'create' ? `Create ${title.slice(0, -1)}` : `Edit ${getItemTitle(activeItem as T)}`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Keep the list readable first, then open or edit details only when you need them.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                {field.label}
                {field.required ? ' *' : ''}
              </span>

              {field.type === 'textarea' ? (
                <textarea
                  aria-label={field.label}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  rows={field.rows ?? 5}
                  value={String(formValues[field.name] ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) => updateValue(field.name, event.target.value)}
                />
              ) : field.type === 'checkbox' ? (
                <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <input
                    aria-label={field.label}
                    type="checkbox"
                    checked={Boolean(formValues[field.name])}
                    onChange={(event) => updateValue(field.name, event.target.checked)}
                  />
                </div>
              ) : field.type === 'select' ? (
                <select
                  aria-label={field.label}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  value={String(formValues[field.name] ?? '')}
                  onChange={(event) => updateValue(field.name, event.target.value)}
                >
                  <option value="">Select...</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label={field.label}
                  type={field.type}
                  className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  value={String(formValues[field.name] ?? '')}
                  placeholder={field.placeholder}
                  onChange={(event) =>
                    updateValue(
                      field.name,
                      field.type === 'number' ? event.target.value : event.target.value,
                    )
                  }
                />
              )}
            </label>
          ))}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create record' : 'Save changes'}
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700"
              onClick={openCreate}
            >
              Reset form
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
