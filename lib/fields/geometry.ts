import type { Field } from '@/lib/domain/types'

export type LatLngPoint = { lat: number; lng: number }

const EARTH_RADIUS_M = 6371008.8

/**
 * Normalizes a closed ring by dropping a duplicate closing vertex when present.
 */
export const normalizePolygonRing = (points: LatLngPoint[]): LatLngPoint[] => {
  if (points.length < 2) {
    return points
  }

  const first = points[0]
  const last = points[points.length - 1]
  if (first.lat === last.lat && first.lng === last.lng) {
    return points.slice(0, -1)
  }

  return points
}

/**
 * Serializes a single outer ring from Leaflet (may be closed) into canonical Field polygon points.
 */
export const polygonPointsFromLeafletRing = (latlngs: Array<{ lat: number; lng: number }>): LatLngPoint[] =>
  normalizePolygonRing(latlngs.map((ll) => ({ lat: ll.lat, lng: ll.lng })))

/**
 * Simple centroid as the arithmetic mean of vertices (adequate for small field polygons).
 */
export const computePolygonCentroid = (points: LatLngPoint[]): LatLngPoint => {
  if (points.length === 0) {
    return { lat: 0, lng: 0 }
  }

  let lat = 0
  let lng = 0
  for (const p of points) {
    lat += p.lat
    lng += p.lng
  }

  const n = points.length
  return { lat: lat / n, lng: lng / n }
}

/**
 * Planar approximation in a local tangent plane (meters) using mean latitude as reference.
 * Suitable for field-scale polygons.
 */
export const computePolygonAreaSqm = (points: LatLngPoint[]): number => {
  const ring = normalizePolygonRing(points)
  if (ring.length < 3) {
    return 0
  }

  const refLatRad = (ring.reduce((sum, p) => sum + p.lat, 0) / ring.length) * (Math.PI / 180)

  const toXY = (p: LatLngPoint) => {
    const latRad = p.lat * (Math.PI / 180)
    const lngRad = p.lng * (Math.PI / 180)
    return {
      x: EARTH_RADIUS_M * lngRad * Math.cos(refLatRad),
      y: EARTH_RADIUS_M * latRad,
    }
  }

  const closed = [...ring, ring[0]]
  let sum = 0
  for (let i = 0; i < closed.length - 1; i++) {
    const a = toXY(closed[i])
    const b = toXY(closed[i + 1])
    sum += a.x * b.y - b.x * a.y
  }

  return Math.abs(sum / 2)
}

export const buildFieldGeometryPayload = (
  polygon: LatLngPoint[],
): Pick<Field, 'polygon' | 'centroid' | 'areaSqm'> => {
  const ring = normalizePolygonRing(polygon)
  const centroid = computePolygonCentroid(ring)
  const areaSqm = computePolygonAreaSqm(ring)
  return {
    polygon: ring,
    centroid,
    areaSqm: Number(areaSqm.toFixed(2)),
  }
}
