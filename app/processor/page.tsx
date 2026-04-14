import Link from 'next/link'

import { SendToLabForm } from '@/components/processor/send-to-lab-form'
import { ProcessorWorkspace } from '@/components/processor/processor-workspace'
import { btnCtaVioletClass, btnSecondaryClass } from '@/components/ui/button-styles'

/** Processor wash-station home: queue, recent runs, and link to the ledger form. */
export default function ProcessorHomePage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Processor</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Wash line &amp; processing</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Lots in <strong>READY_FOR_PROCESSING</strong> are ready for mass-balanced runs (main output + byproducts).
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link href="/processor/record" className={btnCtaVioletClass}>
          Record processing
        </Link>
        <Link href="/" className={btnSecondaryClass}>
          Home dashboard
        </Link>
      </div>
      <SendToLabForm />
      <ProcessorWorkspace />
    </div>
  )
}
