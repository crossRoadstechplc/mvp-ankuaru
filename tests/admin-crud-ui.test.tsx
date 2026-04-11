import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EntityAdminScreen } from '@/components/crud/entity-admin-screen'
import { cloneSeedData } from '@/data/seed-data'

describe('admin CRUD UI shell', () => {
  it('renders the users list and create form in the reusable shell', () => {
    const store = cloneSeedData()

    render(<EntityAdminScreen screen="users" items={store.users} />)

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByText('Alemu Bekele')).toBeInTheDocument()
    expect(screen.getByText('Create form')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Role')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create record' })).toBeInTheDocument()
  })
})
