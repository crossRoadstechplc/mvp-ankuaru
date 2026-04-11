import { RoleMonitorClient } from '@/components/admin/role-monitor-client'

export default function AdminRoleMonitorPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Admin tools</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Role monitor</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          Spin up a disposable data sandbox, pick a role and user, and preview the home dashboard in an iframe. Your main
          workspace file is untouched unless you point APIs at the same project root.
        </p>
      </div>
      <RoleMonitorClient />
    </div>
  )
}
