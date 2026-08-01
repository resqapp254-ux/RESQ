// app/download/page.js
// General "get the app" landing page — for posters, business cards,
// or anywhere you want to point people at RESQ itself rather than
// a specific institution's join code.

export default function DownloadPage() {
  return (
    <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'sans-serif', textAlign: 'center', padding: 24 }}>
      <h1 style={{ color: '#cc0000' }}>Get RESQ</h1>
      <p>Emergency response, fast.</p>
      <div style={{ background: '#f7f7f7', borderRadius: 8, padding: 20, textAlign: 'left', marginTop: 20 }}>
        <p><strong>Android:</strong> Download link coming soon (Google Play submission pending).</p>
        <p><strong>iPhone:</strong> Download link coming soon (App Store submission pending).</p>
        <p>In the meantime, ask your institution admin for the current testing link.</p>
      </div>
    </div>
  )
}
