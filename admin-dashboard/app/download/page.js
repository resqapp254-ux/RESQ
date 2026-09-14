// app/download/page.js
// General "get the app" landing page — for posters, business cards,
// or anywhere you want to point people at RESQ itself rather than
// a specific institution's join code.

import GlobeBackground from '../../components/GlobeBackground'

export default function DownloadPage() {
  return (
    <main className="resq-shell">
      <GlobeBackground />
      <div className="resq-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section className="glass-card resq-fade-in" style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 96, height: 96 }}>
              <img src="/icon.svg" alt="RESQ" width="96" height="96" />
            </div>
          </div>
          <h1 className="resq-h1">Get RESQ</h1>
          <p className="resq-subtle" style={{ marginTop: 8 }}>Emergency response, fast.</p>
          <div className="resq-success-box" style={{ textAlign: 'left', marginTop: 20 }}>
            <p><strong>Android:</strong> Download link coming soon (Google Play submission pending).</p>
            <p style={{ marginTop: 8 }}><strong>iPhone:</strong> Download link coming soon (App Store submission pending).</p>
            <p className="resq-subtle" style={{ marginTop: 8 }}>In the meantime, ask your institution admin for the current testing link, or sign in at this same website from your phone or computer.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
