/**
 * Workspace CTAs: elevated, bordered, and ring-lit so they never read as flat page chrome.
 * Use on `<Link>` or `<button>` for primary / secondary actions on dashboards and forms.
 */

const ctaShell =
  'inline-flex items-center justify-center rounded-full font-semibold transition ' +
  'border shadow-lg ring-2 ring-white/90 ' +
  'hover:shadow-xl hover:brightness-[1.03] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50'

const padMd = ' px-5 py-2.5 text-sm '
const padLg = ' px-6 py-2.5 text-sm '

/** Primary marketplace / trade CTA (amber). */
export const btnCtaAmberClass =
  `${ctaShell}${padMd}` +
  'border-amber-950/30 bg-gradient-to-b from-amber-500 to-amber-900 text-white shadow-amber-900/35 ' +
  'hover:from-amber-500 hover:to-amber-800 focus-visible:outline-amber-500'

export const btnCtaAmberLgClass =
  `${ctaShell}${padLg}` +
  'border-amber-950/30 bg-gradient-to-b from-amber-500 to-amber-900 text-white shadow-amber-900/35 ' +
  'hover:from-amber-500 hover:to-amber-800 focus-visible:outline-amber-500'

/** Processor / wash-line (violet). */
export const btnCtaVioletClass =
  `${ctaShell}${padMd}` +
  'border-violet-950/30 bg-gradient-to-b from-violet-600 to-violet-900 text-white shadow-violet-900/35 ' +
  'hover:from-violet-500 hover:to-violet-800 focus-visible:outline-violet-500'

export const btnCtaVioletLgClass =
  `${ctaShell}${padLg}` +
  'border-violet-950/30 bg-gradient-to-b from-violet-600 to-violet-900 text-white shadow-violet-900/35 ' +
  'hover:from-violet-500 hover:to-violet-800 focus-visible:outline-violet-500'

/** Transport (sky). */
export const btnCtaSkyClass =
  `${ctaShell}${padMd}` +
  'border-sky-950/25 bg-gradient-to-b from-sky-600 to-sky-900 text-white shadow-sky-900/35 ' +
  'hover:from-sky-500 hover:to-sky-800 focus-visible:outline-sky-500'

export const btnCtaSkyLgClass =
  `${ctaShell}${padLg}` +
  'border-sky-950/25 bg-gradient-to-b from-sky-600 to-sky-900 text-white shadow-sky-900/35 ' +
  'hover:from-sky-500 hover:to-sky-800 focus-visible:outline-sky-500'

/** Lab (cyan). */
export const btnCtaCyanClass =
  `${ctaShell}${padMd}` +
  'border-cyan-950/25 bg-gradient-to-b from-cyan-600 to-cyan-900 text-white shadow-cyan-900/35 ' +
  'hover:from-cyan-500 hover:to-cyan-800 focus-visible:outline-cyan-500'

export const btnCtaCyanLgClass =
  `${ctaShell}${padLg}` +
  'border-cyan-950/25 bg-gradient-to-b from-cyan-600 to-cyan-900 text-white shadow-cyan-900/35 ' +
  'hover:from-cyan-500 hover:to-cyan-800 focus-visible:outline-cyan-500'

/** Approvals / go-live (emerald). */
export const btnCtaEmeraldClass =
  `${ctaShell}${padMd}` +
  'border-emerald-950/25 bg-gradient-to-b from-emerald-600 to-emerald-900 text-white shadow-emerald-900/35 ' +
  'hover:from-emerald-500 hover:to-emerald-800 focus-visible:outline-emerald-500'

/** Disaggregate / alternate flows (sky-700 family). */
export const btnCtaSkyAltLgClass =
  `${ctaShell}${padLg}` +
  'border-sky-900/30 bg-gradient-to-b from-sky-600 to-sky-800 text-white shadow-sky-900/35 ' +
  'hover:from-sky-500 hover:to-sky-700 focus-visible:outline-sky-500'

/** Delivery / logistics accent (teal). */
export const btnCtaTealClass =
  `${ctaShell}${padMd}` +
  'border-teal-900/25 bg-gradient-to-b from-teal-500 to-teal-800 text-white shadow-teal-900/30 ' +
  'hover:from-teal-400 hover:to-teal-700 focus-visible:outline-teal-500'

/** Risk / destructive simulators (rose). */
export const btnCtaRoseClass =
  `${ctaShell}${padMd}` +
  'border-rose-950/25 bg-gradient-to-b from-rose-600 to-rose-900 text-white shadow-rose-900/35 ' +
  'hover:from-rose-500 hover:to-rose-800 focus-visible:outline-rose-500'

/** Margin / warning simulators (orange). */
export const btnCtaOrangeClass =
  `${ctaShell}${padMd}` +
  'border-orange-950/25 bg-gradient-to-b from-orange-600 to-orange-900 text-white shadow-orange-900/35 ' +
  'hover:from-orange-500 hover:to-orange-800 focus-visible:outline-orange-500'

/** Strong neutral (onboarding reject, admin). */
export const btnCtaSlateClass =
  `${ctaShell}${padMd}` +
  'border-slate-900/35 bg-gradient-to-b from-slate-700 to-slate-950 text-white shadow-slate-900/40 ' +
  'hover:from-slate-600 hover:to-slate-900 focus-visible:outline-slate-500'

/** Secondary — still lifted off the canvas, not a flat outline. */
export const btnSecondaryClass =
  `${ctaShell}${padMd}` +
  'border-slate-300/90 bg-gradient-to-b from-white to-slate-100 text-slate-900 shadow-slate-900/15 ' +
  'hover:border-amber-300 hover:to-amber-50/90 focus-visible:outline-slate-400'

/** Outline transport “receipt” twin next to dispatch. */
export const btnCtaSkyOutlineClass =
  `${ctaShell}${padMd}` +
  'border-sky-400/90 bg-gradient-to-b from-sky-50 to-white text-sky-950 shadow-sky-900/12 ' +
  'hover:border-sky-500 hover:from-sky-100 focus-visible:outline-sky-500'

/** Compact row actions (“Open”, “Record run”). */
export const btnCtaOpenCompactClass =
  'inline-flex items-center justify-center rounded-full border border-slate-200/90 bg-gradient-to-b from-white to-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/12 ring-2 ring-white/90 transition hover:border-amber-300 hover:shadow-lg hover:to-amber-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500'

/** Alias — primary CTA across role workspaces. */
export const btnPrimaryClass = btnCtaAmberClass
