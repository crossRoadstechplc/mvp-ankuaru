import { AdminSectionLinks } from '@/lib/master-data/admin-config'
import { initializeLiveDataStore } from '@/lib/persistence/live-data-store'

export default async function AdminOverviewPage() {
  const store = await initializeLiveDataStore()

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Overview</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Master data counts and shortcuts. Collections share one API; events stay append-only.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Users</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{store.users.length}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Fields</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{store.fields.length}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Lots</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{store.lots.length}</p>
        </article>
        <article className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm shadow-black/5">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Events</p>
          <p className="mt-3 text-4xl font-semibold text-slate-950">{store.events.length}</p>
          <p className="mt-2 text-sm text-slate-600">Append-only. Not included in destructive CRUD.</p>
        </article>
      </section>

      <AdminSectionLinks />
    </div>
  )
}
