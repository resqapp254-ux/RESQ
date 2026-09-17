'use client'

import { useState } from 'react'

// A password <input> with a built-in show/hide toggle — every password
// field in the app should use this instead of a bare type="password"
// input, so users can verify what they typed before submitting.
export default function PasswordInput({ className, style, wrapperStyle, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div style={{ position: 'relative', ...wrapperStyle }}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: 42, width: '100%', boxSizing: 'border-box', ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        tabIndex={-1}
        style={{
          position: 'absolute',
          right: 6,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 6,
          fontSize: 16,
          lineHeight: 1,
          color: 'var(--resq-text-secondary)'
        }}
      >
        {visible ? '🙈' : '👁️'}
      </button>
    </div>
  )
}
