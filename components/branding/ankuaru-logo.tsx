type AnkuaruLogoProps = {
  compact?: boolean
  className?: string
}

export function AnkuaruLogo({ compact = false, className }: AnkuaruLogoProps) {
  return (
    <div className={['inline-flex items-center gap-3', className ?? ''].join(' ').trim()}>
      <span className="relative inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
          <path
            d="M12 4c3.3 0 6 2.5 6 5.6 0 4.2-3.8 8.1-6 10.4-2.2-2.3-6-6.2-6-10.4C6 6.5 8.7 4 12 4Zm0 2.2c-2.1 0-3.8 1.5-3.8 3.4 0 2.1 1.8 4.5 3.8 6.8 2-2.3 3.8-4.7 3.8-6.8 0-1.9-1.7-3.4-3.8-3.4Z"
            fill="currentColor"
          />
          <path d="M10.7 9.3c.6-.5 1.4-.7 2.2-.4.9.3 1.5 1 1.8 1.9" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <circle cx="12" cy="11.1" r="1.2" fill="currentColor" />
        </svg>
      </span>
      {!compact ? (
        <span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-800">Traceable coffee trade</span>
          <span className="block text-xl font-semibold tracking-tight text-slate-950">Ankuaru</span>
        </span>
      ) : null}
    </div>
  )
}
