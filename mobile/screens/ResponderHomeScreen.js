// screens/ResponderHomeScreen.js
// Shows all active emergencies for the responder's institution.
// Updates live via Supabase Realtime as new emergencies come in
// or existing ones change status (e.g. claimed by another responder).
//
// While any emergency is unclaimed, this screen loops the RESQ siren
// at full volume — the mobile equivalent of the web dashboard's
// alarm, but able to keep sounding through Do Not Disturb once the
// user has granted that (see lib/notifications.js). It stops the
// moment any responder claims it, same rule as the web app.

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Linking, Platform, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAudioPlayer } from 'expo-audio'
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
  triggered: '#ff2b2b',
  claimed: '#e0b34d',
  in_progress: '#35d0e8',
  resolved: '#3fe08a',
  cancelled: '#5c6480'
}

export default function ResponderHomeScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([])
  const [institutionId, setInstitutionId] = useState(null)
  const [institutionName, setInstitutionName] = useState('')
  const [institutionLogo, setInstitutionLogo] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [sirenMuted, setSirenMuted] = useState(false)

  const sirenPlayer = useAudioPlayer(require('../assets/siren.wav'))

  const hasUnclaimed = useMemo(
    () => emergencies.some((e) => !e.claimed_by && e.status !== 'resolved' && e.status !== 'cancelled'),
    [emergencies]
  )

  useEffect(() => {
    sirenPlayer.loop = true
  }, [sirenPlayer])

  useEffect(() => {
    if (hasUnclaimed && !sirenMuted) {
      try {
        sirenPlayer.seekTo(0)
        sirenPlayer.play()
      } catch {
        // Non-fatal — a rare native playback hiccup shouldn't crash the screen
      }
    } else {
      sirenPlayer.pause()
    }
  }, [hasUnclaimed, sirenMuted, sirenPlayer])

  useEffect(() => {
    if (!hasUnclaimed) setSirenMuted(false)
  }, [hasUnclaimed])

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
      } catch {
        // Non-fatal — the responder can still use the app without push access
      }

      const { data: userData } = await supabase.auth.getUser()

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userData.user.id)
        .single()

      if (profileError) return

      setInstitutionId(profile.institution_id)
      await loadEmergencies(profile.institution_id)

      const { data: institution } = await supabase
        .from('institutions')
        .select('name, logo_url')
        .eq('id', profile.institution_id)
        .single()
      if (institution) {
        setInstitutionName(institution.name || '')
        setInstitutionLogo(institution.logo_url || '')
      }

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
    const { data, error } = await supabase
      .from('emergencies')
      .select('*, claimant:profiles!emergencies_claimed_by_fkey(full_name, service_id)')
      .eq('institution_id', instId)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .order('created_at', { ascending: false })

    if (!error) setEmergencies(data)
    setRefreshing(false)
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (institutionId) loadEmergencies(institutionId)
  }, [institutionId])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {hasUnclaimed && (
        <View style={styles.sirenBanner}>
          <Text style={styles.sirenText}>🚨 Unclaimed emergency — respond now</Text>
          <TouchableOpacity onPress={() => setSirenMuted((m) => !m)}>
            <Text style={styles.sirenMuteButton}>{sirenMuted ? '🔇 Unmute' : '🔊 Mute'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.headerRow}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <View style={{ flex: 1 }}>
          <Text style={styles.header}>Active Emergencies</Text>
          {!!institutionName && (
            <View style={styles.institutionRow}>
              {!!institutionLogo && <Image source={{ uri: institutionLogo }} style={styles.institutionLogo} />}
              <Text style={styles.institutionName} numberOfLines={1}>{institutionName}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.teamChatButton} onPress={() => navigation.navigate('InstitutionChat')}>
          <Text style={styles.teamChatButtonText}>💬 Team</Text>
        </TouchableOpacity>
      </View>

      {emergencies.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active emergencies right now.</Text>
        </View>
      )}

      <FlatList
        data={emergencies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff2b2b" />}
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
            {item.claimant && (
              <Text style={styles.claimedBy}>
                ✋ Claimed by {item.claimant.full_name}{item.claimant.service_id ? ' (secondary responder)' : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  sirenBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(204,0,0,0.22)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,43,43,0.4)',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  sirenText: { color: '#ff8080', fontWeight: '700', fontSize: 13, flex: 1 },
  sirenMuteButton: { color: '#f4f6fb', fontWeight: '600', fontSize: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 8 },
  teamChatButton: { backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  teamChatButtonText: { color: '#35d0e8', fontWeight: '600', fontSize: 13 },
  logo: { width: 32, height: 32, borderRadius: 8 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#f4f6fb' },
  institutionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  institutionLogo: { width: 16, height: 16, borderRadius: 4 },
  institutionName: { fontSize: 13, color: '#9aa5c2', flexShrink: 1 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#5c6480' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)'
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  status: { fontWeight: 'bold', fontSize: 16 },
  time: { color: '#5c6480' },
  location: { color: '#9aa4bf' },
  badge: { marginTop: 6, fontSize: 12, color: '#e0b34d', fontWeight: 'bold' },
  claimedBy: { marginTop: 6, fontSize: 12, color: '#35d0e8', fontWeight: '600' }
})
