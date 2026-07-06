// app/join/[code]/page.js
// Shown when someone scans an institution's QR code (e.g. posted
// on a wall/poster). Shows the code clearly and points them to
// get the RESQ app, since deep-linking into an already-installed
// app requires a published app (arrives once we're on app stores).

export default function JoinPage({ params }) {
  const code = params.code?.toUpperCase()

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', fontFamily: 'sans-serif', textAlign: 'center', padding: 24 }}>
      <h1 style={{ color: '#cc0000' }}>RESQ</h1>
      <p>You scanned an emergency code for this location:</p>
      <p style={{ fontSize: 28, fontWeight: 'bold', letterSpacing: 2, margin: '20px 0' }}>{code}</p>
      <div style={{ background: '#f7f7f7', borderRadius: 8, padding: 20, textAlign: 'left' }}>
        <p><strong>To get help:</strong></p>
        <ol>
          <li>Download the RESQ app (link coming soon — for now, ask a staff member for the Expo Go testing link)</li>
          <li>Create an account or log in</li>
          <li>Enter this code: <strong>{code}</strong></li>
          <li>Press the red emergency button any time you need help here</li>
        </ol>
      </div>
    </div>
  )
}
