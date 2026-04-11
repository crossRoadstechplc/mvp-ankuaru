'use client'

import Link from 'next/link'

import type { LineageTreeNode } from '@/lib/traceability/lineage-graph'

export type LineageViewerProps = {
  lotId: string
  backwardRoot: LineageTreeNode
  forwardRoot: LineageTreeNode
}

function LineageTreeNodeView({ node, depth }: { node: LineageTreeNode; depth: number }) {
  const summary = `${node.publicLotCode} · ${node.form} · ${node.status}`

  if (node.branches.length === 0 && !node.truncatedReference) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        style={{ marginLeft: depth === 0 ? 0 : Math.min(depth * 12, 96) }}
      >
        {summary}
      </div>
    )
  }

  return (
    <details
      className="rounded-xl border border-slate-200 bg-white"
      style={{ marginLeft: depth === 0 ? 0 : Math.min(depth * 12, 96) }}
      open={depth < 2}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-slate-900">
        {summary}
        {node.truncatedReference ? (
          <span className="ml-2 text-xs font-normal text-amber-800">(reference)</span>
        ) : null}
      </summary>
      {node.truncatedReference ? (
        <p className="border-t border-slate-100 px-3 py-2 text-xs text-amber-900">
          This lot appears again along another path — DAG merge or cycle protection. No commercial details are shown.
        </p>
      ) : (
        <div className="space-y-2 border-t border-slate-100 px-3 py-3">
          {node.branches.length === 0 ? (
            <p className="text-xs text-slate-500">End of branch.</p>
          ) : (
            node.branches.map((child, index) => (
              <LineageTreeNodeView key={`${child.lotId}-${depth}-${index}`} node={child} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </details>
  )
}

/**
 * Read-only lineage explorer: public lot code, form, and status only (no weights, prices, or internal UUIDs).
 */
export function LineageViewer({ lotId, backwardRoot, forwardRoot }: LineageViewerProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-amber-50/80 p-4 text-sm text-slate-800">
        <p className="font-medium text-amber-950">Privacy</p>
        <p className="mt-1 leading-6">
          This view is intentionally limited to non-sensitive identifiers: public lot code, physical form, and snapshot
          status. Commercial terms, quantities, lab scores, and internal keys stay out of the lineage explorer.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Backward trace (toward origins)</h2>
          <Link
            href={`/lots/${lotId}`}
            className="text-sm font-medium text-amber-800 underline underline-offset-2"
          >
            Open full lot detail
          </Link>
        </div>
        <p className="text-sm text-slate-600">
          Parent lots are derived from events where this lot appears as an output; aggregation collapses many inputs into
          one output.
        </p>
        <LineageTreeNodeView node={backwardRoot} depth={0} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">Forward trace (toward descendants)</h2>
        <p className="text-sm text-slate-600">
          Child lots come from events where this lot is an input — splits, processing outputs, and byproducts appear as
          parallel branches.
        </p>
        <LineageTreeNodeView node={forwardRoot} depth={0} />
      </section>
    </div>
  )
}
