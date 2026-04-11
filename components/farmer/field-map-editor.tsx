'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FeatureGroup, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

import {
  buildFieldGeometryPayload,
  type LatLngPoint,
  polygonPointsFromLeafletRing,
} from '@/lib/fields/geometry'
import { DEFAULT_MAP_FALLBACK_CENTER, resolveMapCenterFromGeolocation } from '@/lib/fields/map-initial-view'

const OSM_TILE = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const useFixedLeafletIcons = () => {
  useEffect(() => {
    // Next.js bundling breaks default marker URLs; draw/edit still references Leaflet icons in some cases.
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])
}

function MapRecenter({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], Math.max(map.getZoom(), 14))
  }, [center.lat, center.lng, map])
  return null
}

const extractPolygonPoints = (layer: L.Layer): LatLngPoint[] | null => {
  if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
    const latlngs = layer.getLatLngs() as L.LatLng[] | L.LatLng[][]
    const ring = Array.isArray(latlngs[0]) ? (latlngs as L.LatLng[][])[0] : (latlngs as L.LatLng[])
    return polygonPointsFromLeafletRing(ring)
  }

  return null
}

function FieldDrawLayers({
  initialPolygon,
  onGeometryChange,
}: {
  initialPolygon: LatLngPoint[] | null
  onGeometryChange: (payload: { polygon: LatLngPoint[]; centroid: LatLngPoint; areaSqm: number } | null) => void
}) {
  const map = useMap()
  const onGeometryChangeRef = useRef(onGeometryChange)
  onGeometryChangeRef.current = onGeometryChange

  const featureGroupRef = useRef<L.FeatureGroup | null>(null)

  useLayoutEffect(() => {
    const drawnItems = featureGroupRef.current
    if (!drawnItems) {
      return
    }

    drawnItems.clearLayers()

    if (initialPolygon && initialPolygon.length >= 3) {
      const latlngs = initialPolygon.map((p) => [p.lat, p.lng] as L.LatLngTuple)
      const poly = L.polygon(latlngs)
      drawnItems.addLayer(poly)
      map.fitBounds(poly.getBounds(), { padding: [40, 40] })
    }

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })

    map.addControl(drawControl)

    const emitFromLayer = (layer: L.Layer | null) => {
      if (!layer) {
        onGeometryChangeRef.current(null)
        return
      }

      const pts = extractPolygonPoints(layer)
      if (!pts || pts.length < 3) {
        onGeometryChangeRef.current(null)
        return
      }

      const geo = buildFieldGeometryPayload(pts)
      onGeometryChangeRef.current({
        polygon: geo.polygon,
        centroid: geo.centroid!,
        areaSqm: geo.areaSqm!,
      })
    }

    const onCreated = (e: L.LeafletEvent) => {
      const created = e as L.DrawEvents.Created
      drawnItems.clearLayers()
      drawnItems.addLayer(created.layer)
      emitFromLayer(created.layer)
    }

    const onEdited = (e: L.LeafletEvent) => {
      const edited = e as L.DrawEvents.Edited
      edited.layers.eachLayer((layer) => {
        emitFromLayer(layer)
      })
    }

    const onDeleted = () => {
      emitFromLayer(null)
    }

    map.on(L.Draw.Event.CREATED, onCreated)
    map.on(L.Draw.Event.EDITED, onEdited)
    map.on(L.Draw.Event.DELETED, onDeleted)

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated)
      map.off(L.Draw.Event.EDITED, onEdited)
      map.off(L.Draw.Event.DELETED, onDeleted)
      map.removeControl(drawControl)
    }
  }, [map, initialPolygon])

  return <FeatureGroup ref={featureGroupRef} />
}

export type FieldMapEditorProps = {
  mapSessionKey: string
  initialPolygon: LatLngPoint[] | null
  onGeometryChange: (payload: { polygon: LatLngPoint[]; centroid: LatLngPoint; areaSqm: number } | null) => void
}

export function FieldMapEditor({ mapSessionKey, initialPolygon, onGeometryChange }: FieldMapEditorProps) {
  useFixedLeafletIcons()

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

  return (
    <div className="h-[min(420px,55vh)] w-full min-h-[320px] overflow-hidden rounded-2xl border border-black/10 bg-slate-100 shadow-inner">
      <MapContainer
        key={mapSessionKey}
        center={[center.lat, center.lng]}
        zoom={15}
        scrollWheelZoom
        className="z-0 h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[320px]"
        style={{ minHeight: 320 }}
      >
        <TileLayer attribution={OSM_ATTR} url={OSM_TILE} />
        <MapRecenter center={center} />
        <FieldDrawLayers initialPolygon={initialPolygon} onGeometryChange={onGeometryChange} />
      </MapContainer>
    </div>
  )
}
