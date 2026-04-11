'use client'

import type { Role } from '@/lib/domain/types'

type RoleSwitcherProps = {
  roles: readonly Role[]
  selectedRole: Role
  selectedUserName?: string
  onRoleChange: (role: Role) => void
}

export function RoleSwitcher({
  roles,
  selectedRole,
  selectedUserName,
  onRoleChange,
}: RoleSwitcherProps) {
  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/90 p-5 shadow-sm shadow-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
            Current selected role
          </p>
          <h2 className="mt-2 text-2xl font-semibold capitalize text-slate-950">
            {selectedRole}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Active user: {selectedUserName ?? 'No user mapped to this role yet'}
          </p>
        </div>

        <label className="flex min-w-[220px] flex-col gap-2 text-sm text-slate-600">
          Switch role
          <select
            aria-label="Switch role"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base capitalize text-slate-900 outline-none ring-0"
            value={selectedRole}
            onChange={(event) => onRoleChange(event.target.value as Role)}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
