// screens/AccountScreen.js
// A minimal account screen: who's signed in, and a direct, visible
// way to delete the account and its data — required for Play Store
// review (any app that lets someone register must offer in-app
// self-service deletion, not just "ask an admin").

import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

export default function AccountScreen({ navigation }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '')
      setPhone(data.user?.phone || '')
    })
  }, [])

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      "This permanently removes your access to RESQ. If you have no case history, your account and its data are deleted immediately. If you've triggered or claimed an emergency before, your login is permanently disabled instead so that case's record stays intact. This cannot be undone from the app — are you sure?",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete my account', style: 'destructive', onPress: deleteAccount }
      ]
    )
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE_URL}/api/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }
      })
      const data = await res.json()
      if (!data.success) {
        Alert.alert('Could not delete account', data.error || 'Unknown error')
        setDeleting(false)
        return
      }
      await supabase.auth.signOut()
      Alert.alert(
        data.outcome === 'deleted' ? 'Account deleted' : 'Account deactivated',
        data.note || 'Your account has been removed.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }) }]
      )
    } catch (err) {
      Alert.alert('Could not delete account', err.message)
      setDeleting(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{email || phone || 'Unknown'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.dangerTitle}>Danger zone</Text>
        <Text style={styles.dangerBody}>
          Deleting your account removes your access to RESQ permanently. This does not affect any institution's
          record of a past emergency you were involved in.
        </Text>
        <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#fff" /> : <Text style={styles.deleteButtonText}>Delete My Account</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d', padding: 16 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  label: { color: '#9aa4bf', fontSize: 12, marginBottom: 4 },
  value: { color: '#f4f6fb', fontSize: 16, fontWeight: '600' },
  dangerTitle: { color: '#ff8080', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  dangerBody: { color: '#9aa4bf', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  deleteButton: { backgroundColor: '#cc0000', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  deleteButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 }
})
