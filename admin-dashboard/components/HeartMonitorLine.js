'use client'

// Seamless 400-unit repeating tile with P wave, Q-R-S complex, and T wave
const CALM =
  'M0,50 L20,50 L26,46 L32,50 L52,50 L56,53 L60,18 L65,78 L70,50 L84,50 L92,42 L100,50 L200,50 ' +
  'L220,50 L226,46 L232,50 L252,50 L256,53 L260,18 L265,78 L270,50 L284,50 L292,42 L300,50 L400,50'

const ALERT =
  'M0,50 L12,50 L16,42 L20,50 L34,50 L38,55 L42,12 L47,88 L52,50 L64,50 L72,36 L80,50 L100,50 ' +
  'L112,50 L116,42 L120,50 L134,50 L138,55 L142,12 L147,88 L152,50 L164,50 L172,36 L180,50 L200,50 ' +
  'L212,50 L216,42 L220,50 L234,50 L238,55 L242,12 L247,88 L252,50 L264,50 L272,36 L280,50 L300,50 ' +
  'L312,50 L316,42 L320,50 L334,50 L338,55 L342,12 L347,88 L352,50 L364,50 L372,36 L380,50 L400,50'

export default function HeartMonitorLine({ alert = false, label }) {
  return (
    <div
      className={'resq-monitor' + (alert ? ' resq-monitor-alert' : '')}
      role="img"
      aria-label={alert ? 'Heart monitor showing active emergency arrhythmia' : 'Heart monitor showing stable vital signs'}
    >
      {label && <span className="resq-monitor-label">{label}</span>}
      <svg viewBox="0 0 400 100" preserveAspectRatio="none">
        <path className="resq-monitor-trace" d={alert ? ALERT : CALM} />
      </svg>
    </div>
  )
}
