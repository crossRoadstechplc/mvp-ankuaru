/** Shared layout for native `<details>` / client collapsible panels (role dashboards). */
export const collapsibleDetailsClass =
  'group rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5 open:shadow-md'

export const collapsibleSummaryClass =
  'cursor-pointer list-none [&::-webkit-details-marker]:hidden flex flex-wrap items-start justify-between gap-3'

export const collapsibleChevronClass =
  'select-none text-lg leading-none text-slate-500 transition-transform duration-200 group-open:rotate-180'

export const collapsibleBodyClass = 'mt-6 border-t border-slate-100 pt-6'
