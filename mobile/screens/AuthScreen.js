// screens/AuthScreen.js
// Sign in, create account, and password recovery — one screen with
// tabs, mirroring the web app's combined auth page. Replaces the
// separate LoginScreen/SignUpScreen as the app's actual entry point;
// BootstrapScreen sends here only when there's no existing session.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { useTranslation } from '../lib/i18n'
import { API_BASE_URL } from '../lib/config'
import MiniGlobe from '../components/MiniGlobe'
import RadarPulseBackground from '../components/RadarPulseBackground'

export default function AuthScreen({ navigation }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('signin')
  const [loading, setLoading] = useState(false)

  const [signInForm, setSignInForm] = useState({ email: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  async function handleLogin() {
    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword(signInForm)

    if (signInError) {
      setLoading(false)
      Alert.alert('Login failed', signInError.message)
      return
    }

    const { data, error: statusError } = await supabase.rpc('get_onboarding_status')
    setLoading(false)

    if (statusError) {
      Alert.alert('Error', 'Could not load account status.')
      return
    }

    if (data.role === 'user' && data.next_step === 'enter_institution_code') {
      navigation.replace('EnterInstitutionCode')
    } else if (data.role === 'responder') {
      navigation.replace('ResponderHome')
    } else if (data.role === 'user') {
      navigation.replace('Home')
    } else if (data.role === 'institution_admin' || data.role === 'super_admin') {
      navigation.replace('AdminWebView')
    } else {
      Alert.alert('Account role could not be determined', 'Please contact support.')
    }
  }

  async function handleSignUp() {
    const { fullName, email, phone, password } = signUpForm
    if (!fullName || !email || !phone || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.')
      return
    }

    setLoading(true)
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'user', full_name: fullName, phone } }
    })

    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
      return
    }

    if (!data.session) {
      Alert.alert('Check your email', 'We sent a confirmation link. Verify your email, then log in below.')
      setMode('signin')
      return
    }

    navigation.replace('EnterInstitutionCode')
  }

  async function handleForgot() {
    if (!forgotEmail.trim()) {
      Alert.alert('Missing email', 'Enter the email on your account.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${API_BASE_URL}/reset-password`
    })
    setLoading(false)

    if (error) {
      Alert.alert('Could not send reset link', error.message)
      return
    }
    setForgotSent(true)
  }

  return (
    <View style={styles.screen}>
      <RadarPulseBackground />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.globeWrap}>
          <MiniGlobe size={92} />
        </View>
        <Text style={styles.brandTitle}>RESQ</Text>

        <View style={styles.card}>
        <View style={styles.tabs}>
        {[
          { key: 'signin', label: t('signIn') },
          { key: 'signup', label: t('signUp') },
          { key: 'forgot', label: t('forgotPassword') }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, mode === tab.key && styles.tabActive]}
            onPress={() => setMode(tab.key)}
          >
            <Text style={[styles.tabText, mode === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'signin' && (
        <View>
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            placeholderTextColor="#5c6480"
            value={signInForm.email}
            onChangeText={(v) => setSignInForm({ ...signInForm, email: v })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder={t('password')}
            placeholderTextColor="#5c6480"
            value={signInForm.password}
            onChangeText={(v) => setSignInForm({ ...signInForm, password: v })}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('logIn')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'signup' && (
        <View>
          <TextInput
            style={styles.input}
            placeholder={t('fullName')}
            placeholderTextColor="#5c6480"
            value={signUpForm.fullName}
            onChangeText={(v) => setSignUpForm({ ...signUpForm, fullName: v })}
          />
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            placeholderTextColor="#5c6480"
            value={signUpForm.email}
            onChangeText={(v) => setSignUpForm({ ...signUpForm, email: v })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder={t('phoneNumber')}
            placeholderTextColor="#5c6480"
            value={signUpForm.phone}
            onChangeText={(v) => setSignUpForm({ ...signUpForm, phone: v })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder={t('password')}
            placeholderTextColor="#5c6480"
            value={signUpForm.password}
            onChangeText={(v) => setSignUpForm({ ...signUpForm, password: v })}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('createAccount')}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'forgot' && (
        <View>
          {forgotSent ? (
            <Text style={styles.successText}>If that email is registered, a reset link has been sent. Open it on this phone or a computer.</Text>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder={t('email')}
                placeholderTextColor="#5c6480"
                value={forgotEmail}
                onChangeText={setForgotEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.button} onPress={handleForgot} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('sendResetLink')}</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#05070d' },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  globeWrap: { alignItems: 'center', marginBottom: 4 },
  brandTitle: {
    textAlign: 'center',
    color: '#f4f6fb',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20
  },
  card: {
    backgroundColor: 'rgba(18,24,42,0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, marginBottom: 20, gap: 4 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 7, alignItems: 'center' },
  tabActive: { backgroundColor: '#cc0000' },
  tabText: { color: '#9aa4bf', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f4f6fb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12
  },
  button: {
    backgroundColor: '#cc0000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  successText: { color: '#3fe08a', textAlign: 'center', lineHeight: 20 }
})
