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

const onSegment = (a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): boolean => {
  const minX = Math.min(a.lng, b.lng)
  const maxX = Math.max(a.lng, b.lng)
  const minY = Math.min(a.lat, b.lat)
  const maxY = Math.max(a.lat, b.lat)
  const area = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
  const eps = 1e-12
  return Math.abs(area) <= eps && c.lng >= minX - eps && c.lng <= maxX + eps && c.lat >= minY - eps && c.lat <= maxY + eps
}

const orientation = (a: LatLngPoint, b: LatLngPoint, c: LatLngPoint): number => {
  const val = (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
  if (Math.abs(val) <= 1e-12) {
    return 0
  }
  return val > 0 ? 1 : -1
}

const segmentsIntersect = (p1: LatLngPoint, q1: LatLngPoint, p2: LatLngPoint, q2: LatLngPoint): boolean => {
  const o1 = orientation(p1, q1, p2)
  const o2 = orientation(p1, q1, q2)
  const o3 = orientation(p2, q2, p1)
  const o4 = orientation(p2, q2, q1)

  if (o1 !== o2 && o3 !== o4) {
    return true
  }
  if (o1 === 0 && onSegment(p1, q1, p2)) {
    return true
  }
  if (o2 === 0 && onSegment(p1, q1, q2)) {
    return true
  }
  if (o3 === 0 && onSegment(p2, q2, p1)) {
    return true
  }
  if (o4 === 0 && onSegment(p2, q2, q1)) {
    return true
  }
  return false
}

const pointInPolygon = (point: LatLngPoint, polygon: LatLngPoint[]): boolean => {
  const ring = normalizePolygonRing(polygon)
  if (ring.length < 3) {
    return false
  }
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i]
    const pj = ring[j]
    if (onSegment(pj, pi, point)) {
      return true
    }
    const yi = pi.lat
    const yj = pj.lat
    const xi = pi.lng
    const xj = pj.lng
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

export const polygonsOverlap = (a: LatLngPoint[], b: LatLngPoint[]): boolean => {
  const p1 = normalizePolygonRing(a)
  const p2 = normalizePolygonRing(b)
  if (p1.length < 3 || p2.length < 3) {
    return false
  }

  for (let i = 0; i < p1.length; i++) {
    const a1 = p1[i]
    const a2 = p1[(i + 1) % p1.length]
    for (let j = 0; j < p2.length; j++) {
      const b1 = p2[j]
      const b2 = p2[(j + 1) % p2.length]
      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true
      }
    }
  }

  return pointInPolygon(p1[0], p2) || pointInPolygon(p2[0], p1)
}
