// screens/SignUpScreen.js
// Public self-signup — for `user` role only.
// Responders are created by their institution_admin, not here.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, ScrollView } from 'react-native'
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
    <ScrollView contentContainerStyle={styles.container} style={{ backgroundColor: '#05070d' }}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Create your RESQ account</Text>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#5c6480"
        value={fullName}
        onChangeText={setFullName}
      />
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
        placeholder="Phone number"
        placeholderTextColor="#5c6480"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#5c6480"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
        Already have an account? Log in
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 16, borderRadius: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#f4f6fb' },
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
