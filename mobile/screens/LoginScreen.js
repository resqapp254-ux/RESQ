// screens/LoginScreen.js
// Shared login for `user` and `responder` roles on mobile.
// Routes to the right next screen based on onboarding status.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native'
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

    console.log('LOGIN - onboarding status:', JSON.stringify(data), 'error:', JSON.stringify(statusError))

    if (statusError) {
      Alert.alert('Error', 'Could not load account status.')
      return
    }

    if (data.role === 'user' && data.next_step === 'enter_institution_code') {
      console.log('LOGIN - routing to EnterInstitutionCode')
      navigation.replace('EnterInstitutionCode')
    } else if (data.role === 'responder') {
      console.log('LOGIN - routing to ResponderHome')
      navigation.replace('ResponderHome')
    } else if (data.role === 'user') {
      console.log('LOGIN - routing to Home')
      navigation.replace('Home')
    } else {
      console.log('LOGIN - unrecognized role, showing alert')
      Alert.alert('Wrong app', 'This account type should use the RESQ admin dashboard, not the mobile app.')
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>RESQ</Text>
      <Text style={styles.subtitle}>Emergency response, fast.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#5c6480"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#5c6480"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
      </TouchableOpacity>

      <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
        New here? Create an account
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#05070d' },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: 16, borderRadius: 20 },
  title: { fontSize: 32, fontWeight: 'bold', textAlign: 'center', color: '#f4f6fb', letterSpacing: 1 },
  subtitle: { textAlign: 'center', marginBottom: 28, color: '#9aa4bf' },
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
    marginTop: 8,
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  link: { marginTop: 20, textAlign: 'center', color: '#35d0e8' }
})
