// app/join/[code]/page.js
// Shown when someone scans an institution's QR code (e.g. posted
// on a wall/poster). Shows the code clearly and points them to
// get the RESQ app, since deep-linking into an already-installed
// app requires a published app (arrives once we're on app stores).

import GlobeBackground from '../../../components/GlobeBackground'
import RadarSweepBackground from '../../../components/RadarSweepBackground'

export default function JoinPage({ params }) {
  const code = params.code?.toUpperCase()

  return (
    <main className="resq-shell">
      <GlobeBackground />
      <RadarSweepBackground />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-tilt-card resq-fade-in" style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <h1 className="resq-h1">RESQ</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>You scanned an emergency code for this location:</p>
          <p style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 2, margin: '20px 0' }}>{code}</p>
          <div className="resq-success-box" style={{ textAlign: 'left' }}>
            <p><strong>To get help:</strong></p>
            <ol style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>
                <a href="/download">Get the RESQ app</a>, or use this same website on your phone or computer
              </li>
              <li>Create an account or log in</li>
              <li>Enter this code: <strong>{code}</strong></li>
              <li>Press the red emergency button any time you need help here</li>
            </ol>
          </div>
        </section>
      </div>
    </main>
  )
}
