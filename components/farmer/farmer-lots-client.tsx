'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo } from 'react'

import { useLiveDataPoll } from '@/hooks/use-live-data-poll'
import { useLiveDataClientStore } from '@/store/live-data-client-store'
import { useSessionStore } from '@/store/session-store'
import { useUiStore } from '@/store/ui-store'

import { btnCtaAmberClass, btnSecondaryClass } from '@/components/ui/button-styles'
import { CollapsibleSection } from '@/components/ui/collapsible-section'

import { FarmerLotCreationForm } from './farmer-lot-creation-form'
import { FarmerOriginLotsMapDynamic } from './farmer-origin-lots-map-dynamic'
import { FarmerOriginLotsList } from './farmer-origin-lots-list'

export function FarmerLotsClient() {
  const searchParams = useSearchParams()
  const selectedRole = useUiStore((s) => s.selectedRole)
  const selectedUserId = useUiStore((s) => s.selectedUserId)
  const sessionRole = useSessionStore((s) => s.currentUserRole)
  const sessionUserId = useSessionStore((s) => s.currentUserId)

  const isFarmerSession = sessionRole === 'farmer'
  const isAggregatorSession = sessionRole === 'aggregator'

  const farmerUserId = useMemo(() => {
    const q = searchParams.get('farmerId')
    if (q) {
      return q
    }
    if (sessionRole === 'farmer' && sessionUserId) {
      return sessionUserId
    }
    if (selectedRole === 'farmer' && selectedUserId) {
      return selectedUserId
    }
    return 'user-farmer-001'
  }, [searchParams, selectedRole, selectedUserId, sessionRole, sessionUserId])

  const fields = useLiveDataClientStore((s) => s.fields)
  const lots = useLiveDataClientStore((s) => s.lots)
  const loading = useLiveDataClientStore((s) => s.fieldsLoading || s.lotsLoading)
  const fieldError = useLiveDataClientStore((s) => s.fieldsError)
  const lotError = useLiveDataClientStore((s) => s.lotsError)
  const loadAll = useLiveDataClientStore((s) => s.loadAll)
  const loadError = fieldError ?? lotError

  const reload = useCallback(async () => {
    await loadAll({ force: true })
  }, [loadAll])

  useEffect(() => {
    void loadAll({ force: true })
  }, [loadAll])

  const listMode = isFarmerSession ? 'single-farmer' : 'all-farmers-origin'
  useLiveDataPoll('all', { enabled: listMode === 'all-farmers-origin' })

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
            {isFarmerSession ? 'Farmer · Stage 06' : isAggregatorSession ? 'Aggregator' : 'Lots'}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {isFarmerSession ? 'Pick creation' : isAggregatorSession ? 'Farmer origin lots' : 'Farmer lots'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {isFarmerSession ? (
              <>
                Pick cherry into a new pick bound to one of your fields. The API creates the lot snapshot and an
                append-only PICK event in one transaction.
              </>
            ) : isAggregatorSession ? (
              <>
                Every lot in the store that is still tied to a farmer account. Review picks on the map by field, then open{' '}
                <strong>Create aggregation</strong> when you control the source lots you want to merge.
              </>
            ) : (
              <>Origin lots linked to farmers. Lot creation is only available when signed in as a farmer.</>
            )}
          </p>
          {isFarmerSession ? (
            <p className="mt-2 text-sm text-slate-600">
              Farmer user: <span className="font-mono text-slate-900">{farmerUserId}</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isFarmerSession ? (
            <Link href="/farmer/fields" className={btnSecondaryClass}>
              Field management
            </Link>
          ) : null}
          {isAggregatorSession ? (
            <Link href="/actions/create-aggregation?role=aggregator" className={btnCtaAmberClass}>
              Create aggregation
            </Link>
          ) : null}
          <Link href="/" className={btnSecondaryClass}>
            Dashboard
          </Link>
        </div>
      </header>

      {sessionRole && !isFarmerSession && !isAggregatorSession ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4 text-sm text-sky-950">
          <p className="font-medium">Viewing as {sessionRole}</p>
          <p className="mt-2 text-sky-900/90">
            Below: all farmer-linked origin lots. Add <span className="font-mono">?farmerId=…</span> only affects filters
            if you switch to a farmer-specific tool elsewhere — here the table is <strong>all farmers</strong> for review.
          </p>
        </div>
      ) : null}

      {isFarmerSession ? (
        <CollapsibleSection kicker="Farmer" title="Create pick" defaultOpen>
          {loading ? (
            <p className="text-sm text-slate-600">Loading…</p>
          ) : loadError ? (
            <p className="text-sm text-red-700">{loadError}</p>
          ) : (
            <FarmerLotCreationForm
              farmerUserId={farmerUserId}
              fields={fields}
              onCreated={() => {
                void reload()
              }}
            />
          )}
        </CollapsibleSection>
      ) : null}

      {isAggregatorSession ? (
        <CollapsibleSection
          kicker="Aggregator"
          title="Origin map"
          description="Field boundaries and lot markers for farmers with picks in the live store."
          defaultOpen
        >
          {loading ? (
            <p className="text-sm text-slate-600">Loading map data…</p>
          ) : loadError ? (
            <p className="text-sm text-red-700">{loadError}</p>
          ) : (
            <FarmerOriginLotsMapDynamic lots={lots} fields={fields} />
          )}
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection
        kicker={isFarmerSession ? 'Farmer' : 'Inventory'}
        title={isFarmerSession ? 'Your picks' : isAggregatorSession ? 'Table view (all farmer-origin lots)' : 'All farmer-origin lots'}
        description={
          isFarmerSession
            ? 'Includes all picks where you are recorded as farmer.'
            : 'Sorted newest first. Weight is the farmer-declared quantity on the lot snapshot — open a lot for events and lineage.'
        }
        defaultOpen={!isAggregatorSession}
      >
        {loading && !isAggregatorSession ? (
          <p className="text-sm text-slate-600">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-red-700">{loadError}</p>
        ) : (
          <FarmerOriginLotsList lots={lots} fields={fields} farmerUserId={farmerUserId} listMode={listMode} />
        )}
      </CollapsibleSection>
    </main>
  )
}
