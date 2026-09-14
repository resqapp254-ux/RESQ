// app/login/page.js
// One combined page for sign in, sign up, and password recovery —
// see components/AuthPage.js.

'use client'

import AuthPage from '../../components/AuthPage'

export default function LoginPage() {
  return <AuthPage defaultMode="signin" />
}
