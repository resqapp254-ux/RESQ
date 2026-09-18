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

export function friendlyAuthError(error) {
  if (isEmailAlreadyExistsError(error)) {
    return 'This email is already registered to another RESQ account. Use a different email, or ask them to sign in with their existing account instead.'
  }
  return error?.message || 'Failed to create account'
}
