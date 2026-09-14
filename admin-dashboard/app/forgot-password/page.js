// app/forgot-password/page.js
// Same combined page as /login, opened on the "Forgot password" tab
// — see components/AuthPage.js.

'use client'

import AuthPage from '../../components/AuthPage'

export default function ForgotPasswordPage() {
  return <AuthPage defaultMode="forgot" />
}
