// screens/LoginScreen.js
// Shared login for `user` and `responder` roles on mobile.
// Routes to the right next screen based on onboarding status.

import React, { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

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
    } else {
      Alert.alert('Wrong app', 'This account type should use the RESQ admin dashboard, not the mobile app.')
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESQ</Text>
      <Text style={styles.subtitle}>Emergency response, fast.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title={loading ? 'Logging in...' : 'Log In'} onPress={handleLogin} disabled={loading} />

      <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
        New here? Create an account
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#cc0000' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  link: { marginTop: 16, textAlign: 'center', color: '#0066cc' }
})
