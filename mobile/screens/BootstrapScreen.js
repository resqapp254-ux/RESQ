// screens/BootstrapScreen.js
// The app's real initial route. Decides where to land WITHOUT ever
// showing the login form if a valid session already exists — this is
// what fixes "I have to log in twice": before this screen existed,
// the navigator always mounted straight into the Login screen, even
// when Supabase's persisted session (AsyncStorage) was still valid,
// so typing credentials the first time landed on a stale screen and
// only a second attempt actually routed correctly.

import React, { useEffect } from 'react'
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../lib/supabase'

const CONSENT_KEY = 'resq-consent-accepted'

export default function BootstrapScreen({ navigation }) {
  useEffect(() => {
    let cancelled = false

    async function boot() {
      const consented = await AsyncStorage.getItem(CONSENT_KEY)
      if (!consented) {
        if (!cancelled) navigation.replace('LanguageConsent')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        if (!cancelled) navigation.replace('Auth')
        return
      }

      const { data, error } = await supabase.rpc('get_onboarding_status')
      if (cancelled) return

      if (error || !data?.role) {
        navigation.replace('Auth')
        return
      }

      if (data.role === 'user' && data.next_step === 'enter_institution_code') {
        navigation.replace('EnterInstitutionCode')
      } else if (data.role === 'responder') {
        navigation.replace('ResponderHome')
      } else if (data.role === 'user') {
        // Reopening the app mid-emergency should resume it, not offer
        // a fresh trigger screen that could file a duplicate report.
        const { data: userData } = await supabase.auth.getUser()
        const { data: openEmergency } = await supabase
          .from('emergencies')
          .select('id')
          .eq('triggered_by', userData.user.id)
          .in('status', ['triggered', 'claimed', 'in_progress'])
          .limit(1)
          .maybeSingle()

        if (cancelled) return

        if (openEmergency) {
          navigation.replace('UserEmergencyActive', { emergencyId: openEmergency.id })
        } else {
          navigation.replace('Home')
        }
      } else if (data.role === 'institution_admin' || data.role === 'super_admin') {
        navigation.replace('AdminWebView')
      } else {
        navigation.replace('Auth')
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [navigation])

  return (
    <View style={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <ActivityIndicator size="large" color="#ff2b2b" style={{ marginTop: 20 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#05070d' },
  logo: { width: 96, height: 96, borderRadius: 22 }
})
