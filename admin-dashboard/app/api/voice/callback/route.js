// app/api/voice/callback/route.js
//
// Africa's Talking calls this when an escalation call (see
// lib/escalateEmergency.js) connects, and expects back their XML
// "Voice Actions" format telling it what to do on the call — here,
// just read a short alert aloud. Register this route's full URL as
// the Voice Callback URL for your Voice-enabled number in the
// Africa's Talking dashboard; nothing calls this route directly.

export async function POST() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">Emergency alert from RESQ. An unclaimed emergency needs a responder now. Please open the RESQ app immediately.</Say>
</Response>`

  return new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } })
}
