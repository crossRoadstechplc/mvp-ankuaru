'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { btnCtaSkyLgClass } from '@/components/ui/button-styles'
import { showAppToast } from '@/lib/client/app-toast'
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

export function ReceiptForm() {
  const router = useRouter()
  const [lots, setLots] = useState<Lot[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [lotId, setLotId] = useState('')
  const [transporterUserId, setTransporterUserId] = useState('')
  const [nextCustodianId, setNextCustodianId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [driverId, setDriverId] = useState('')
  const [locationStatus, setLocationStatus] = useState('')
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
        const receivers = (userRes as User[]).filter((u) => u.isActive && u.role !== 'transporter')
        setNextCustodianId((prev) => prev || receivers.find((u) => u.role === 'exporter')?.id || receivers[0]?.id || '')
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
  const inTransitLots = lots.filter((l) => l.status === 'IN_TRANSIT')

  const selectedNext = users.find((u) => u.id === nextCustodianId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!lotId || !transporterUserId || !nextCustodianId || !selectedNext) {
      setError('Lot, transporter, and next custodian are required.')
      return
    }

    setSaving(true)
    try {
      await fetchJson('/api/transport/receipt', {
        method: 'POST',
        body: JSON.stringify({
          lotId,
          transporterUserId,
          nextCustodianId,
          nextCustodianRole: selectedNext.role,
          vehicleId: vehicleId || undefined,
          driverId: driverId || undefined,
          locationStatus: locationStatus.trim() || undefined,
        }),
      })
      showAppToast('Receipt recorded. Custody transferred to the next party.')
      setLocationStatus('')
      router.back()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record receipt')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-slate-600">
        Receipt transfers <strong>custody</strong> from the transporter to the receiving party. Snapshot status returns
        to <code className="rounded bg-slate-100 px-1 text-xs">ACTIVE</code>. <strong>Ownership</strong> is unchanged.
      </p>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Lot in transit</span>
        <select
          value={lotId}
          onChange={(e) => setLotId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          <option value="">Select lot</option>
          {inTransitLots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.publicLotCode} · custodian {lot.custodianRole}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Transporter (releasing custody)</span>
        <select
          value={transporterUserId}
          onChange={(e) => setTransporterUserId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {transporterUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Next custodian (receiver)</span>
        <select
          value={nextCustodianId}
          onChange={(e) => setNextCustodianId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          required
        >
          {users
            .filter((u) => u.isActive)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.role}
              </option>
            ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Vehicle (optional)</span>
        <select
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">—</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Driver (optional)</span>
        <select
          value={driverId}
          onChange={(e) => setDriverId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        >
          <option value="">—</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Location / dock note (optional)</span>
        <input
          value={locationStatus}
          onChange={(e) => setLocationStatus(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className={btnCtaSkyLgClass}
      >
        {saving ? 'Recording…' : 'Record receipt'}
      </button>
    </form>
  )
}
