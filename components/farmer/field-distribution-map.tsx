'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

import type { Field } from '@/lib/domain/types'
import { DEFAULT_MAP_FALLBACK_CENTER, resolveMapCenterFromGeolocation } from '@/lib/fields/map-initial-view'
import type { FieldDistributionMapProps } from './field-distribution-map.types'

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const FARMER_COLORS = ['#f59e0b', '#0ea5e9', '#22c55e', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#3b82f6']

const colorForFarmer = (farmerId: string): string => {
  const sum = [...farmerId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return FARMER_COLORS[sum % FARMER_COLORS.length]
}

function FitToFields({ fields }: { fields: Field[] }) {
  const map = useMap()
  useEffect(() => {
    if (fields.length === 0) {
      return
    }

    const pts = fields.flatMap((field) => field.polygon.map((p) => [p.lat, p.lng] as [number, number]))
    if (pts.length === 0) {
      return
    }

    map.fitBounds(pts, { padding: [24, 24] })
  }, [fields, map])
  return null
}

export function FieldDistributionMap({ fields, title = 'Field distribution map' }: FieldDistributionMapProps) {
  const [center, setCenter] = useState(DEFAULT_MAP_FALLBACK_CENTER)

  useEffect(() => {
    let cancelled = false
    void resolveMapCenterFromGeolocation(
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
      DEFAULT_MAP_FALLBACK_CENTER,
    ).then((res) => {
      if (!cancelled) {
        setCenter({ lat: res.lat, lng: res.lng })
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const legend = useMemo(() => {
    const ids = [...new Set(fields.map((f) => f.farmerId))]
    return ids.map((id) => ({ farmerId: id, color: colorForFarmer(id) }))
  }, [fields])

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Map</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">All farmer fields are color-coded by farmer ID.</p>

      <div className="mt-4 h-[min(420px,55vh)] w-full min-h-[320px] overflow-hidden rounded-2xl border border-black/10 bg-slate-100">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={13}
          scrollWheelZoom
          className="z-0 h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
          style={{ minHeight: 320 }}
        >
          <TileLayer attribution={OSM_ATTR} url={OSM_TILE} />
          <FitToFields fields={fields} />
          {fields.map((field) => (
            <Polygon
              key={field.id}
              positions={field.polygon.map((p) => [p.lat, p.lng])}
              pathOptions={{
                color: colorForFarmer(field.farmerId),
                fillColor: colorForFarmer(field.farmerId),
                fillOpacity: 0.22,
                weight: 2,
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold">{field.name}</div>
                  <div>{field.farmerId}</div>
                </div>
              </Tooltip>
            </Polygon>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {legend.map((row) => (
          <span
            key={row.farmerId}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"
          >
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            {row.farmerId}
          </span>
        ))}
      </div>
    </section>
  )
}
