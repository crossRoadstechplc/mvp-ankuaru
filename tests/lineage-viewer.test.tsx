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
  it('renders backward and forward sections with sample graph data', () => {
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

    const forward: LineageTreeNode = node({
      lotId: 'root',
      publicLotCode: 'PLT-ROOT',
      branches: [
        node({ lotId: 'c1', publicLotCode: 'PLT-C1', form: 'GREEN', branches: [] }),
        node({ lotId: 'c2', publicLotCode: 'PLT-C2', form: 'BYPRODUCT', branches: [] }),
      ],
    })

    render(<LineageViewer lotId="root" backwardRoot={backward} forwardRoot={forward} />)

    expect(screen.getByText(/Backward trace \(toward origins\)/)).toBeInTheDocument()
    expect(screen.getByText(/Forward trace \(toward descendants\)/)).toBeInTheDocument()
    expect(screen.getByText(/Privacy/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-P1/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-C1/)).toBeInTheDocument()
    expect(screen.getByText(/PLT-C2/)).toBeInTheDocument()
    expect(screen.queryByText(/internalUuid/i)).not.toBeInTheDocument()
  })
})
