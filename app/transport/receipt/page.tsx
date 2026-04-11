import { ReceiptForm } from '@/components/transport/receipt-form'

export default function TransportReceiptPage() {
  return (
    <div className="mt-8">
      <h1 className="text-3xl font-semibold text-slate-950">Record receipt</h1>
      <p className="mt-3 text-sm text-slate-600">
        Confirm receipt into the next custodian&apos;s hands. Choose the receiving user; their role must match the
        account record.
      </p>
      <div className="mt-8 max-w-lg">
        <ReceiptForm />
      </div>
    </div>
  )
}
