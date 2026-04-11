'use client'

import type { Field, Lot, User } from '@/lib/domain/types'
import {
  crudAdminConfigMap,
  type CrudAdminScreenName,
} from '@/lib/master-data/admin-config'

import { CrudShell } from './crud-shell'

type ScreenEntityMap = {
  users: User
  fields: Field
  lots: Lot
}

type EntityAdminScreenProps<Name extends CrudAdminScreenName> = {
  screen: Name
  items: ScreenEntityMap[Name][]
}

export function EntityAdminScreen<Name extends CrudAdminScreenName>({
  screen,
  items,
}: EntityAdminScreenProps<Name>) {
  if (screen === 'users') {
    return <CrudShell {...crudAdminConfigMap.users} items={items as User[]} />
  }

  if (screen === 'fields') {
    return <CrudShell {...crudAdminConfigMap.fields} items={items as Field[]} />
  }

  return <CrudShell {...crudAdminConfigMap.lots} items={items as Lot[]} />
}
