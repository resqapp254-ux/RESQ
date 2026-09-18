// lib/authErrors.js
// Mirrors admin-dashboard/lib/authErrors.js. @supabase/auth-js
// (confirmed in the pinned version) treats every 500-599 response as
// "retryable" and never parses its JSON body, falling through to
// JSON.stringify(theRawResponseObject) for the error message — a
// fetch Response has no enumerable own properties, so that comes out
// as the literal text "{}". A broken SMTP relay (Supabase's
// confirmation/recovery email failing, a real issue reproduced
// directly against this project) surfaces exactly that way: a bare
// "{}" alert instead of any readable message. Not fixable upstream,
// so every place that shows an auth error substitutes a real
// sentence when this happens.

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

export function isUselessErrorMessage(message) {
  const trimmed = (message || '').toString().trim()
  return !trimmed || trimmed === '{}' || trimmed === '[object Object]'
}

export function friendlyAuthError(error, fallback = 'Something went wrong. Please try again in a moment.') {
  if (isEmailAlreadyExistsError(error)) {
    return 'This email is already registered to another RESQ account. Use a different email, or sign in with your existing account instead.'
  }
  if (isUselessErrorMessage(error?.message)) {
    return fallback
  }
  return error?.message || fallback
}
