'use client'

import { useState } from 'react'

// A single collapsible node in an org-hierarchy tree (institution →
// partner unit → responders). Uses the CSS grid 0fr/1fr trick for
// smooth height-morphing without needing to measure content height —
// no JS height calculation, no layout thrash, just grid-template-rows
// + overflow:hidden on an inner wrapper.

export default function OrgTreeNode({ label, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ marginBottom: 6 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          textAlign: 'left',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--resq-glass-border)',
          borderRadius: 8,
          padding: '8px 12px',
          color: 'var(--resq-text-primary)',
          cursor: 'pointer',
          font: 'inherit'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: 11,
            opacity: 0.7
          }}
        >
          ▸
        </span>
        <strong style={{ fontSize: 13 }}>{label}</strong>
        {typeof count === 'number' && (
          <span className="resq-subtle" style={{ fontSize: 11, marginLeft: 'auto' }}>{count}</span>
        )}
      </button>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: open ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s cubic-bezier(0.34, 1.1, 0.64, 1)'
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div style={{ paddingLeft: 20, paddingTop: 8 }}>{children}</div>
        </div>
      </div>
    </div>
  )
}
