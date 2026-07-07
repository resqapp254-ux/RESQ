// screens/ResponderHomeScreen.js
// Shows all active emergencies for the responder's institution.
// Updates live via Supabase Realtime as new emergencies come in
// or existing ones change status (e.g. claimed by another responder).

import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Linking, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications } from '../lib/notifications'

const STATUS_LABELS = {
  triggered: 'NEW — Unclaimed',
  claimed: 'Claimed',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  cancelled: 'Cancelled'
}

const STATUS_COLORS = {
  triggered: '#cc0000',
  claimed: '#b8860b',
  in_progress: '#1a5fb4',
  resolved: '#1a7f37',
  cancelled: '#888'
}

export default function ResponderHomeScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([])
  const [institutionId, setInstitutionId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let channel
    async function init() {
      try {
        const token = await registerForPushNotifications()
        if (!token && Platform.OS === 'android') {
          Alert.alert(
            'Enable Emergency Alerts',
            'To make sure you never miss an emergency — even on silent — RESQ needs Do Not Disturb access. Please enable it in the settings screen that opens.',
            [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          )
        }
      } catch (err) {
        console.log('PUSH NOTIFICATION REGISTRATION FAILED (non-fatal):', err.message)
      }

      const { data: userData } = await supabase.auth.getUser()
      console.log('Logged in as user id:', userData.user?.id, userData.user?.email)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userData.user.id)
        .single()

      if (profileError) {
        console.log('PROFILE FETCH ERROR:', JSON.stringify(profileError))
        return
      }
      console.log('Responder institution_id:', profile.institution_id)

      setInstitutionId(profile.institution_id)
      await loadEmergencies(profile.institution_id)

      // Live updates: any insert/update on emergencies for this institution
      channel = supabase
        .channel('emergencies-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergencies', filter: `institution_id=eq.${profile.institution_id}` },
          () => loadEmergencies(profile.institution_id)
        )
        .subscribe()
    }
    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  async function loadEmergencies(instId) {
    console.log('Loading emergencies for institution:', instId)
    const { data, error } = await supabase
      .from('emergencies')
      .select('*')
      .eq('institution_id', instId)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) {
      console.log('LOAD EMERGENCIES ERROR:', JSON.stringify(error))
    } else {
      console.log('Loaded emergencies count:', data.length)
      setEmergencies(data)
    }
    setRefreshing(false)
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (institutionId) loadEmergencies(institutionId)
  }, [institutionId])

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Active Emergencies</Text>

      {emergencies.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active emergencies right now.</Text>
        </View>
      )}

      <FlatList
        data={emergencies}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('EmergencyDetail', { emergencyId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>
                {STATUS_LABELS[item.status]}
              </Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
            <Text style={styles.location}>
              {item.lat != null ? `Lat: ${item.lat.toFixed(5)}, Lng: ${item.lng.toFixed(5)}` : `No GPS — phone: ${item.triggered_by_phone || 'unknown'}`}
            </Text>
            {item.triggered_via !== 'app' && (
              <Text style={styles.badge}>via {item.triggered_via.toUpperCase()}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fafafa' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888' },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  status: { fontWeight: 'bold', fontSize: 16 },
  time: { color: '#888' },
  location: { color: '#333' },
  badge: { marginTop: 6, fontSize: 12, color: '#b8860b', fontWeight: 'bold' }
})