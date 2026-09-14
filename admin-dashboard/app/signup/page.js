// app/signup/page.js
// Same combined page as /login, opened on the "Create account" tab
// — see components/AuthPage.js.

'use client'

import AuthPage from '../../components/AuthPage'

export default function SignupPage() {
  return <AuthPage defaultMode="signup" />
}
