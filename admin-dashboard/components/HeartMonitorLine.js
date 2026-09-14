'use client'

// A scrolling ICU-style heart-monitor strip. Calm/regular trace when
// `alert` is false, faster erratic trace (panic-style) when true.
// The path is drawn twice, back to back (0-200 then 200-400), so a
// CSS translateX(-50%) loop over the 2x-width svg scrolls seamlessly.

const CALM = 'M0,50 L30,50 L38,42 L46,50 L60,50 L68,15 L76,85 L84,50 L100,50 L108,40 L116,50 L200,50 ' +
  'L230,50 L238,42 L246,50 L260,50 L268,15 L276,85 L284,50 L300,50 L308,40 L316,50 L400,50'

const ALERT = 'M0,50 L10,50 L16,20 L22,80 L28,30 L34,70 L40,50 L60,50 L66,12 L72,88 L78,22 L84,78 L90,50 ' +
  'L110,50 L116,18 L122,82 L128,38 L134,62 L140,50 L200,50 ' +
  'L210,50 L216,20 L222,80 L228,30 L234,70 L240,50 L260,50 L266,12 L272,88 L278,22 L284,78 L290,50 ' +
  'L310,50 L316,18 L322,82 L328,38 L334,62 L340,50 L400,50'

export default function HeartMonitorLine({ alert = false, label }) {
  return (
    <div className={'resq-monitor' + (alert ? ' resq-monitor-alert' : '')} role="img" aria-label={alert ? 'Heart monitor showing an active emergency' : 'Heart monitor showing all clear'}>
      {label && <span className="resq-monitor-label">{label}</span>}
      <svg viewBox="0 0 400 100" preserveAspectRatio="none">
        <path className="resq-monitor-trace" d={alert ? ALERT : CALM} />
      </svg>
    </div>
  )
}
