'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Driver, Lot, User, Vehicle } from '@/lib/domain/types'

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

export function SendToLabForm() {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [lotId, setLotId] = useState('')
  const [transporterUserId, setTransporterUserId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [labUserId, setLabUserId] = useState('')
  const [locationStatus, setLocationStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [lotRes, userRes, vehicleRes, driverRes] = await Promise.all([
          fetchJson('/api/lots'),
          fetchJson('/api/users'),
          fetchJson('/api/vehicles'),
          fetchJson('/api/drivers'),
        ])
        if (cancelled) return
        const nextLots = lotRes as Lot[]
        const nextUsers = userRes as User[]
        const nextVehicles = vehicleRes as Vehicle[]
        const nextDrivers = driverRes as Driver[]
        setLots(nextLots)
        setUsers(nextUsers)
        setVehicles(nextVehicles)
        setDrivers(nextDrivers)
        setLotId((prev) => prev || nextLots.find((lot) => lot.status !== 'IN_TRANSIT')?.id || '')
        setTransporterUserId(
          (prev) => prev || nextUsers.find((user) => user.role === 'transporter' && user.isActive)?.id || '',
        )
        setLabUserId((prev) => prev || nextUsers.find((user) => user.role === 'lab' && user.isActive)?.id || '')
        setVehicleId((prev) => prev || nextVehicles[0]?.id || '')
        setDriverId((prev) => prev || nextDrivers[0]?.id || '')
      } catch {
        setError('Failed to load assignment data')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const eligibleLots = useMemo(
    () => lots.filter((lot) => lot.status !== 'IN_TRANSIT' && lot.status !== 'CLOSED' && lot.status !== 'QUARANTINED'),
    [lots],
  )
  const transporters = useMemo(
    () => users.filter((user) => user.role === 'transporter' && user.isActive),
    [users],
  )
  const labUsers = useMemo(() => users.filter((user) => user.role === 'lab' && user.isActive), [users])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!lotId || !transporterUserId || !vehicleId || !driverId || !labUserId) {
      setError('Lot, transporter, vehicle, driver, and lab are required.')
      return
    }
    setSaving(true)
    try {
      await fetchJson('/api/transport/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          lotId,
          transporterUserId,
          vehicleId,
          driverId,
          locationStatus: locationStatus.trim() || 'Assigned from processor to lab',
        }),
      })
      await fetchJson('/api/transport/receipt', {
        method: 'POST',
        body: JSON.stringify({
          lotId,
          transporterUserId,
          nextCustodianId: labUserId,
          nextCustodianRole: 'lab',
          vehicleId,
          driverId,
          locationStatus: locationStatus.trim() || 'Received at assigned lab',
        }),
      })
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lot to lab')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">Assign transporter and lab (one step)</h2>
      <p className="text-sm text-slate-600">
        Processor assigns transporter, fleet, driver, and lab tech once. The system records dispatch + receipt and moves
        the lot to <code className="rounded bg-slate-100 px-1 text-xs">AT_LAB</code>.
      </p>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Lot</span>
        <select
          value={lotId}
          onChange={(e) => setLotId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select lot</option>
          {eligibleLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.publicLotCode} · {lot.status}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Transporter</span>
        <select
          value={transporterUserId}
          onChange={(e) => setTransporterUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select transporter</option>
          {transporters.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Vehicle</span>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.plateNumber}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Driver</span>
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Lab tech / lab user</span>
        <select
          value={labUserId}
          onChange={(e) => setLabUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select lab</option>
          {labUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Route note (optional)</span>
        <input
          value={locationStatus}
          onChange={(e) => setLocationStatus(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Fleet checkpoint, corridor, destination..."
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Assigning…' : 'Assign and send to lab'}
      </button>
    </form>
  )
}
