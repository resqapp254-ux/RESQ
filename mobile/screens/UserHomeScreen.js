// screens/UserHomeScreen.js
// The core of the user side: one big button that sends an
// emergency with the user's live location, then routes them
// to the active-emergency screen with AI advice.

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

export default function UserHomeScreen({ navigation }) {
  const [sending, setSending] = useState(false)

  async function handleTriggerEmergency() {
    setSending(true)

    try {
      // 1. Location permission + fix
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location needed', 'RESQ needs your location to send help to the right place.')
        setSending(false)
        return
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const { latitude, longitude } = position.coords

      // 2. Get my institution
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userData.user.id)
        .single()

      if (profileError || !profile.institution_id) {
        Alert.alert('Not linked to an institution', 'Please enter your institution code first.')
        setSending(false)
        return
      }

      // 3. Create the emergency
      const { data: emergency, error: insertError } = await supabase
        .from('emergencies')
        .insert({
          institution_id: profile.institution_id,
          triggered_by: userData.user.id,
          lat: latitude,
          lng: longitude,
          triggered_via: 'app'
        })
        .select()
        .single()

      if (insertError) {
        Alert.alert('Could not send emergency', insertError.message)
        setSending(false)
        return
      }

      // 4. Ask the server to generate AI advice (fire, then navigate — don't block on it)
      console.log('Calling AI advice endpoint:', `${API_BASE_URL}/api/emergency/generate-advice`)
      fetch(`${API_BASE_URL}/api/emergency/generate-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: emergency.id })
      })
        .then((res) => {
          console.log('AI advice response status:', res.status)
          return res.json()
        })
        .then((data) => console.log('AI advice response body:', JSON.stringify(data)))
        .catch((err) => console.log('AI advice fetch FAILED:', err.message))

      setSending(false)
      navigation.replace('UserEmergencyActive', { emergencyId: emergency.id })
    } catch (err) {
      setSending(false)
      Alert.alert('Something went wrong', err.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESQ</Text>
      <Text style={styles.subtitle}>Press the button below if you need help right now.</Text>

      <TouchableOpacity
        style={styles.bigButton}
        onPress={handleTriggerEmergency}
        disabled={sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <Text style={styles.bigButtonText}>SEND{'\n'}EMERGENCY</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Your exact location will be shared with your institution's emergency responders.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#cc0000', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 40 },
  bigButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#cc0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  bigButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  footnote: { marginTop: 40, textAlign: 'center', color: '#999', fontSize: 12, paddingHorizontal: 20 }
})