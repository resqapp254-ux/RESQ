// lib/verifyWebhookSecret.js
// Africa's Talking doesn't sign USSD/SMS webhook requests, so
// anyone who finds the URL could POST fake emergencies otherwise.
// Configure the same secret in two places: this env var, and as a
// query string on the callback URL you register with Africa's
// Talking, e.g. https://yourapp.com/api/sms?key=THE_SECRET
//
// If AFRICASTALKING_WEBHOOK_SECRET is unset, this is a no-op (so
// local dev and an initial deploy aren't blocked) — but it logs a
// warning, since running it unset in production leaves the webhook
// open to anyone.
export function verifyWebhookSecret(request) {
  const expected = process.env.AFRICASTALKING_WEBHOOK_SECRET
  if (!expected) {
    console.warn('AFRICASTALKING_WEBHOOK_SECRET is not set — this webhook is unauthenticated. Set it and add ?key=... to the callback URL in the Africa\'s Talking dashboard.')
    return true
  }
  const provided = new URL(request.url).searchParams.get('key')
  return provided === expected
}
