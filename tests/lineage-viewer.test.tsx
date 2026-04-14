import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { LineageViewer } from '@/components/lineage/lineage-viewer'

import type { LineageTreeNode } from '@/lib/traceability/lineage-graph'

afterEach(() => {
  cleanup()
})

const node = (partial: Partial<LineageTreeNode> & Pick<LineageTreeNode, 'lotId'>): LineageTreeNode => ({
  publicLotCode: 'PLT-TEST',
  form: 'CHERRY',
  status: 'ACTIVE',
  branches: [],
  ...partial,
})

describe('LineageViewer', () => {
  it('renders direct-parent section with sample graph data', () => {
    const backward: LineageTreeNode = node({
      lotId: 'root',
      publicLotCode: 'PLT-ROOT',
      branches: [
        node({
          lotId: 'p1',
          publicLotCode: 'PLT-P1',
          form: 'CHERRY',
          branches: [],
        }),
      ],
    })

    render(<LineageViewer lotId="root" backwardRoot={backward} />)

    expect(screen.getByText(/Direct parents \(one hop upstream\)/)).toBeInTheDocument()
    expect(screen.getByText(/Privacy/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-P1/)).toBeInTheDocument()
    expect(screen.queryByText(/PLT-C1/)).not.toBeInTheDocument()
    expect(screen.queryByText(/internalUuid/i)).not.toBeInTheDocument()
  })
})
