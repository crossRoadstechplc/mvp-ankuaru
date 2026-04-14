type LoginBankStatusRibbonProps = {
  approved: boolean
}

/**
 * Diagonal top-right corner ribbon for bank trading clearance (processor, exporter, importer).
 */
export function LoginBankStatusRibbon({ approved }: LoginBankStatusRibbonProps) {
  const label = approved ? 'Bank Approved' : 'Not Approved'
  return (
    <div
      className="pointer-events-none absolute right-0 top-0 z-10 h-[4.85rem] w-[4.85rem] overflow-hidden sm:h-[5.35rem] sm:w-[5.35rem]"
      role="status"
      aria-label={label}
    >
      <div
        className={`absolute right-[-2.1rem] top-[1.05rem] flex w-[9.25rem] rotate-45 items-center justify-center border border-white/35 py-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.2)] sm:right-[-1.95rem] sm:top-[1.2rem] sm:w-[10rem] sm:py-2 ${
          approved ? 'bg-emerald-600' : 'bg-rose-600'
        }`}
      >
        <span className="text-[10px] font-bold tracking-tight text-white sm:text-[11px]">{label}</span>
      </div>
    </div>
  )
}
