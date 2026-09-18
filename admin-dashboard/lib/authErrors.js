// lib/authErrors.js
// Supabase's own "this email is already registered" wording varies
// by version/message shape (status 422, code 'email_exists', or just
// English text depending on how the error surfaced), so every admin-
// creation route (create-responder, create-unit-admin,
// create-institution) checks for it the same way here instead of
// each guessing at authError.message on its own.

export function isEmailAlreadyExistsError(error) {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  return (
    error.status === 422 ||
    error.code === 'email_exists' ||
    msg.includes('already been registered') ||
    msg.includes('already registered') ||
    msg.includes('already exists')
  )
}

// @supabase/auth-js (confirmed in v2.110.0, the version this app
// pins) treats every 500-599 response as "retryable" and never parses
// its JSON body — see handleError()/_getErrorMessage() in
// node_modules/@supabase/auth-js/dist/module/lib/fetch.js. For a
// plain 500 it falls through to `JSON.stringify(theRawResponseObject)`,
// and a fetch Response has no enumerable own properties, so that
// stringifies to the literal text "{}". That's what a broken SMTP
// relay (a real, reproduced issue: Supabase's confirmation/recovery
// email currently fails with a 500) surfaces as in the UI — a bare
// "{}" instead of any readable message. Not something this app's code
// can fix upstream, so every place that shows an auth error checks
// for this and substitutes a real sentence instead.
export function isUselessErrorMessage(message) {
  const trimmed = (message || '').toString().trim()
  return !trimmed || trimmed === '{}' || trimmed === '[object Object]'
}

export function friendlyAuthError(error, fallback = 'Something went wrong. Please try again in a moment.') {
  if (isEmailAlreadyExistsError(error)) {
    return 'This email is already registered to another RESQ account. Use a different email, or ask them to sign in with their existing account instead.'
  }
  if (isUselessErrorMessage(error?.message)) {
    return fallback
  }
  return error?.message || fallback
}
