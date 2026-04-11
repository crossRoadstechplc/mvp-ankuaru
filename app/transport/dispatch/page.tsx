import { DispatchForm } from '@/components/transport/dispatch-form'

export default function TransportDispatchPage() {
  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold text-slate-950">Record dispatch</h1>
      <p className="mt-3 text-sm text-slate-600">
        Assign vehicle and driver from master data. Custody moves to the transporter; ownership is unchanged.
      </p>
      <div className="mt-8 max-w-lg">
        <DispatchForm />
      </div>
    </div>
  )
}
