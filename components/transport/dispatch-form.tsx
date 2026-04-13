'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
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

export function DispatchForm() {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [lotId, setLotId] = useState('')
  const [transporterUserId, setTransporterUserId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [locationStatus, setLocationStatus] = useState('')
  const [insuredInTransit, setInsuredInTransit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [lotRes, userRes, vRes, dRes] = await Promise.all([
          fetchJson('/api/lots'),
          fetchJson('/api/users'),
          fetchJson('/api/vehicles'),
          fetchJson('/api/drivers'),
        ])
        if (cancelled) return
        setLots(lotRes as Lot[])
        setUsers(userRes as User[])
        setVehicles(vRes as Vehicle[])
        setDrivers(dRes as Driver[])
        const transporters = (userRes as User[]).filter((u) => u.role === 'transporter' && u.isActive)
        setTransporterUserId((prev) => prev || transporters[0]?.id || '')
        setVehicleId((prev) => prev || (vRes as Vehicle[])[0]?.id || '')
        setDriverId((prev) => prev || (dRes as Driver[])[0]?.id || '')
      } catch {
        setError('Failed to load reference data')
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const transporterUsers = users.filter((u) => u.role === 'transporter' && u.isActive)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!lotId || !transporterUserId || !vehicleId || !driverId) {
      setError('Lot, transporter, vehicle, and driver are required.')
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
          locationStatus: locationStatus.trim() || undefined,
          insuredInTransit: insuredInTransit || undefined,
        }),
      })
      setLocationStatus('')
      setInsuredInTransit(false)
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record dispatch')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-slate-600">
        Dispatch moves <strong>custody</strong> to the transporter and sets the lot to <code className="rounded bg-slate-100 px-1 text-xs">IN_TRANSIT</code>.
        Legal <strong>ownership</strong> does not change.
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
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.publicLotCode} · {lot.status} · custodian {lot.custodianRole}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Transporter (carrier user)</span>
        <select
          value={transporterUserId}
          onChange={(e) => setTransporterUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {transporterUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.id})
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
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber} {v.ownerName ? `· ${v.ownerName}` : ''}
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
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} {d.phone ? `· ${d.phone}` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Location / route note (optional)</span>
        <input
          value={locationStatus}
          onChange={(e) => setLocationStatus(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          placeholder="Checkpoint, corridor, facility…"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={insuredInTransit}
          onChange={(e) => setInsuredInTransit(e.target.checked)}
        />
        <span>Insured in transit (shown on lot page while status is IN_TRANSIT)</span>
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-sky-800 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? 'Recording…' : 'Record dispatch'}
      </button>
    </form>
  )
}
