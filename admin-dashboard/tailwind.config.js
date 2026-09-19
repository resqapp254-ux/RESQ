/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],
  corePlugins: {
    // Tailwind's base reset (preflight) rewrites default element
    // styling (margins, box-sizing, headings, etc.) globally — RESQ
    // already has its own reset/base styles in
    // styles/resq-design-system.css, used by every page including
    // ones this migration isn't touching yet. Disabling preflight
    // keeps Tailwind purely additive (utility classes only) so it
    // can't silently break any page that hasn't been redesigned.
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        // Mirrors the existing --resq-* CSS custom properties so new
        // Tailwind-based UI can share the same palette instead of a
        // second, drifting copy of the brand colors.
        resq: {
          red: '#cc0000',
          'red-bright': '#ff2b2b',
          'bg-deep': '#05070d',
          green: '#3fe08a',
          cyan: '#35d0e8',
          'cyan-light': '#7fe3f2',
          amber: '#e0b34d',
          'red-soft': '#ff8080'
        }
      },
      animation: {
        'neon-pulse': 'neon-pulse 1.6s ease-in-out infinite',
        'ambient-glow': 'ambient-glow 8s ease-in-out infinite'
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(255,43,43,0.55), 0 0 0 rgba(255,43,43,0)' },
          '50%': { boxShadow: '0 0 22px 6px rgba(255,43,43,0.85), 0 0 30px 10px rgba(255,43,43,0.25)' }
        },
        'ambient-glow': {
          '0%, 100%': { opacity: 0.35, transform: 'scale(1)' },
          '50%': { opacity: 0.55, transform: 'scale(1.08)' }
        }
      }
    }
  },
  plugins: []
}
