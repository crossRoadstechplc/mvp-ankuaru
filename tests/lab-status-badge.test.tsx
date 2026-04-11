import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LabStatusBadge } from '@/components/labs/lab-status-badge'

afterEach(() => {
  cleanup()
})

describe('LabStatusBadge', () => {
  it('renders labels for workflow states', () => {
    const { rerender } = render(<LabStatusBadge status="PENDING" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()

    rerender(<LabStatusBadge status="APPROVED" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()

    rerender(<LabStatusBadge status="FAILED" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })
})
