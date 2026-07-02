// screens/EnterInstitutionCodeScreen.js
// Shown once, after first signup/login, until the user enters
// the code that routes their emergencies to the right institution.

import React, { useState } from 'react'
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export default function EnterInstitutionCodeScreen({ navigation }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Your Institution Code</Text>
      <Text style={styles.subtitle}>
        This code was given to you by your school, workplace, or community organization.
        It ensures your emergencies reach the right responders.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. RESQ-AB12CD"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />

      <Button title={loading ? 'Joining...' : 'Continue'} onPress={handleJoin} disabled={loading} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { textAlign: 'center', marginBottom: 24, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12, textAlign: 'center' }
})
