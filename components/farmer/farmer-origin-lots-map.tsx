'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import type { Field, Lot } from '@/lib/domain/types'
import {
  DEFAULT_MAP_FALLBACK_CENTER,
  DISTRIBUTION_MAP_FALLBACK_ZOOM,
  DISTRIBUTION_MAP_GEOLOCATION_ZOOM,
  resolveMapCenterFromGeolocation,
} from '@/lib/fields/map-initial-view'

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const FARMER_COLORS = ['#f59e0b', '#0ea5e9', '#22c55e', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6']

const colorForFarmer = (farmerId: string): string => {
  const sum = [...farmerId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return FARMER_COLORS[sum % FARMER_COLORS.length]
}

const validationStroke = (status: Lot['validationStatus']): string => {
  if (status === 'VALIDATED') return '#15803d'
  if (status === 'REJECTED') return '#be123c'
  return '#b45309'
}

const fieldCenter = (field: Field): { lat: number; lng: number } => {
  if (field.centroid) {
    return field.centroid
  }
  const poly = field.polygon
  if (!poly.length) {
    return DEFAULT_MAP_FALLBACK_CENTER
  }
  const lat = poly.reduce((s, p) => s + p.lat, 0) / poly.length
  const lng = poly.reduce((s, p) => s + p.lng, 0) / poly.length
  return { lat, lng }
}

const jitter = (index: number, base: { lat: number; lng: number }) => {
  const step = 0.0004
  return {
    lat: base.lat + step * Math.sin(index * 1.9),
    lng: base.lng + step * Math.cos(index * 1.9),
  }
}

function FitToFields({ fields, enabled }: { fields: Field[]; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || fields.length === 0) {
      return
    }
    const pts = fields.flatMap((field) => field.polygon.map((p) => [p.lat, p.lng] as [number, number]))
    if (pts.length === 0) {
      return
    }
    map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 })
  }, [enabled, fields, map])
  return null
}

function SyncMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom, { animate: false })
  }, [center, zoom, map])
  return null
}

export type FarmerOriginLotsMapProps = {
  lots: Lot[]
  fields: Field[]
}

/**
 * Map-first view for aggregator review: field polygons for farmers with origin lots, markers at plot centers.
 */
export function FarmerOriginLotsMap({ lots, fields }: FarmerOriginLotsMapProps) {
  const visible = useMemo(
    () => [...lots].filter((l) => Boolean(l.farmerId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [lots],
  )

  const farmerIds = useMemo(() => {
    const s = new Set<string>()
    for (const l of visible) {
      if (l.farmerId) {
        s.add(l.farmerId)
      }
    }
    return s
  }, [visible])

  const mapFields = useMemo(() => fields.filter((f) => farmerIds.has(f.farmerId)), [fields, farmerIds])

  const fieldById = useMemo(() => {
    const m = new Map<string, Field>()
    for (const f of fields) {
      m.set(f.id, f)
    }
    return m
  }, [fields])

  const markers = useMemo(() => {
    const perFieldIndex = new Map<string, number>()
    const out: Array<{ lot: Lot; position: { lat: number; lng: number } }> = []
    for (const lot of visible) {
      if (!lot.fieldId) {
        continue
      }
      const field = fieldById.get(lot.fieldId)
      if (!field) {
        continue
      }
      const base = fieldCenter(field)
      const i = perFieldIndex.get(lot.fieldId) ?? 0
      perFieldIndex.set(lot.fieldId, i + 1)
      out.push({ lot, position: jitter(i, base) })
    }
    return out
  }, [visible, fieldById])

  const unmappedLots = useMemo(
    () => visible.filter((l) => !l.fieldId || !fieldById.get(l.fieldId ?? '')),
    [visible, fieldById],
  )

  const [view, setView] = useState({
    center: DEFAULT_MAP_FALLBACK_CENTER,
    zoom: DISTRIBUTION_MAP_FALLBACK_ZOOM,
  })
  const [locationReady, setLocationReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    void resolveMapCenterFromGeolocation(
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
      DEFAULT_MAP_FALLBACK_CENTER,
    ).then((res) => {
      if (!cancelled) {
        setView({
          center: { lat: res.lat, lng: res.lng },
          zoom: res.source === 'geolocation' ? DISTRIBUTION_MAP_GEOLOCATION_ZOOM : DISTRIBUTION_MAP_FALLBACK_ZOOM,
        })
        setLocationReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        No farmer-linked origin lots in the store yet. Lots must have a farmer record to appear on the map.
      </p>
    )
  }

  if (mapFields.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-950">
        <p className="font-medium">No mapped fields for these farmers</p>
        <p className="mt-2 text-amber-900/90">
          Field polygons are required to plot picks. Open <strong>Table view</strong> below to see lots by row, or ask
          farmers to register fields under <span className="font-mono">/farmer/fields</span>.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Map</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Farmer origin lots by field</h2>
      <p className="mt-2 text-sm text-slate-600">
        Polygons are registered fields for farmers with picks. Markers sit at the plot center (slightly offset when
        several lots share one field). Stroke color reflects aggregator validation.
      </p>

      <div className="mt-4 h-[min(480px,60vh)] w-full min-h-[320px] overflow-hidden rounded-2xl border border-black/10 bg-slate-100">
        <MapContainer
          center={[view.center.lat, view.center.lng]}
          zoom={view.zoom}
          scrollWheelZoom
          className="z-0 h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
          style={{ minHeight: 320 }}
        >
          <TileLayer attribution={OSM_ATTR} url={OSM_TILE} />
          <SyncMapView center={[view.center.lat, view.center.lng]} zoom={view.zoom} />
          <FitToFields fields={mapFields} enabled={locationReady} />
          {mapFields.map((field) => (
            <Polygon
              key={field.id}
              positions={field.polygon.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: colorForFarmer(field.farmerId),
                fillColor: colorForFarmer(field.farmerId),
                fillOpacity: 0.18,
                weight: 2,
              }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{field.name}</p>
                  <p className="text-slate-700">{field.farmerId}</p>
                </div>
              </Popup>
            </Polygon>
          ))}
          {markers.map(({ lot, position }) => (
            <CircleMarker
              key={lot.id}
              center={[position.lat, position.lng]}
              radius={9}
              pathOptions={{
                color: validationStroke(lot.validationStatus),
                fillColor: colorForFarmer(lot.farmerId ?? ''),
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div className="min-w-[10rem] text-xs">
                  <p className="font-mono font-semibold text-slate-900">{lot.publicLotCode}</p>
                  <p className="mt-1 text-slate-700">
                    {lot.form} · {lot.weight} kg · {lot.validationStatus}
                  </p>
                  <div className="mt-2 flex flex-col gap-1">
                    <Link href={`/lots/${lot.id}`} className="font-medium text-amber-800 underline-offset-2 hover:underline">
                      Lot detail
                    </Link>
                    <Link
                      href={`/aggregator/lot-validation/${lot.id}`}
                      className="font-medium text-amber-800 underline-offset-2 hover:underline"
                    >
                      Validation
                    </Link>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {[...farmerIds].map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"
          >
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: colorForFarmer(id) }} />
            {id}
          </span>
        ))}
      </div>

      {unmappedLots.length > 0 ? (
        <p className="mt-4 text-xs text-slate-600">
          <span className="font-medium text-slate-800">{unmappedLots.length}</span> lot
          {unmappedLots.length === 1 ? '' : 's'} without a resolvable field link — use the table view to open them.
        </p>
      ) : null}
    </section>
  )
}
