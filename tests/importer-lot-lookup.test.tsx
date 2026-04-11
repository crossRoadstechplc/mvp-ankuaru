import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ImporterLotLookup } from '@/components/importer/importer-lot-lookup'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

afterEach(() => {
  cleanup()
  push.mockReset()
})

describe('ImporterLotLookup', () => {
  it('navigates when lot is authorized', () => {
    render(
      <ImporterLotLookup buyerUserId="user-importer-001" authorizedLotIds={['lot-green-001']} />,
    )
    fireEvent.change(screen.getByPlaceholderText('lot-green-001'), { target: { value: 'lot-green-001' } })
    fireEvent.click(screen.getByRole('button', { name: /open trace/i }))
    expect(push).toHaveBeenCalledWith(
      '/importer/lots/lot-green-001?buyerUserId=user-importer-001',
    )
  })

  it('shows error when lot is not authorized', () => {
    render(<ImporterLotLookup buyerUserId="user-importer-001" authorizedLotIds={[]} />)
    fireEvent.change(screen.getByPlaceholderText('lot-green-001'), { target: { value: 'lot-x' } })
    fireEvent.click(screen.getByRole('button', { name: /open trace/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/not authorized/i)
    expect(push).not.toHaveBeenCalled()
  })

  it('renders quick links for authorized lots', () => {
    render(
      <ImporterLotLookup buyerUserId="user-importer-001" authorizedLotIds={['lot-green-001', 'lot-cherry-001']} />,
    )
    const chips = screen.getByTestId('importer-authorized-lot-chips')
    expect(chips.querySelectorAll('a')).toHaveLength(2)
  })
})
