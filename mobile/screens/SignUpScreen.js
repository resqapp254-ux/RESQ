// screens/SignUpScreen.js
// Public self-signup — for `user` role only.
// Responders are created by their institution_admin, not here.

import React, { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export default function SignUpScreen({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!fullName || !email || !phone || !password) {
      Alert.alert('Missing info', 'Please fill in all fields.')
      return
    }

    setLoading(true)

    // Make sure no stale session from a previous account interferes
    await supabase.auth.signOut()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'user', // self-signup is always role 'user'
          full_name: fullName,
          phone: phone
        }
      }
    })

    setLoading(false)

    if (error) {
      Alert.alert('Sign up failed', error.message)
      return
    }

    // Supabase silently returns no error AND no new session if this email
    // already has an account — catch that case explicitly.
    if (!data.session) {
      Alert.alert(
        'Account already exists',
        'This email is already registered. Please log in instead.'
      )
      navigation.replace('Login')
      return
    }

    // Next: user must enter their institution code
    navigation.replace('EnterInstitutionCode')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your RESQ account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
      />
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
        placeholder="Phone number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title={loading ? 'Creating account...' : 'Sign Up'} onPress={handleSignUp} disabled={loading} />

      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Log in
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
  link: { marginTop: 16, textAlign: 'center', color: '#0066cc' }
})
