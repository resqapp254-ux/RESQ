// screens/EnterInstitutionCodeScreen.js
// Shown once, after first signup/login, until the user enters
// the code that routes their emergencies to the right institution.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native'
import { supabase } from '../lib/supabase'

export default function EnterInstitutionCodeScreen({ navigation }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentEmail, setCurrentEmail] = useState('')

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentEmail(data.user.email)
    })
  }, [])

  async function handleJoin() {
    if (!code) {
      Alert.alert('Missing code', 'Please enter your institution code.')
      return
    }

    setLoading(true)
    const { data, error } = await supabase.rpc('join_institution_by_code', { code })
    setLoading(false)

    if (error || !data.success) {
      Alert.alert('Could not join', data?.error || error?.message || 'Unknown error')
      return
    }

    Alert.alert('Connected', `You're now linked to ${data.institution_name}.`)
    navigation.replace('Home')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigation.replace('Login')
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.title}>Enter Your Institution Code</Text>
      <Text style={styles.subtitle}>
        This code was given to you by your school, workplace, or community organization.
        It ensures your emergencies reach the right responders.
      </Text>

      {currentEmail ? (
        <Text style={styles.currentUser}>Signed in as: {currentEmail}</Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="e.g. RESQ-AB12CD"
        placeholderTextColor="#5c6480"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />

      <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading} activeOpacity={0.85}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue</Text>}
      </TouchableOpacity>

      <Text style={styles.logoutLink} onPress={handleLogout}>
        Not you? Log out
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#05070d' },
  logo: { width: 72, height: 72, alignSelf: 'center', marginBottom: 16, borderRadius: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#f4f6fb' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#9aa4bf' },
  currentUser: { textAlign: 'center', marginBottom: 16, color: '#5c6480', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f4f6fb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    textAlign: 'center'
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
  logoutLink: { marginTop: 20, textAlign: 'center', color: '#35d0e8' }
})
