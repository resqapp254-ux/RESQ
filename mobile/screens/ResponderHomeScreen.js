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
import { MotiView } from 'moti'
import { supabase } from '../lib/supabase'
import { registerForPushNotifications } from '../lib/notifications'
import { pickMatchingServices } from '../lib/serviceDispatch'
import IdentityPrompt from '../components/IdentityPrompt'

const STATUS_LABELS = {
  triggered: 'NEW: Unclaimed',
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
  const [myServiceId, setMyServiceId] = useState(null)
  const [myServiceName, setMyServiceName] = useState('')
  const [myPermission, setMyPermission] = useState('full')
  const [myEmergencyTypes, setMyEmergencyTypes] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sirenMuted, setSirenMuted] = useState(false)
  const [myUserId, setMyUserId] = useState('')
  const [identityNeeds, setIdentityNeeds] = useState({ admissionNumber: false, photo: false })
  const [institutionServicesForRouting, setInstitutionServicesForRouting] = useState([])
  const [claimableResponders, setClaimableResponders] = useState([])

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
            'To make sure you never miss an emergency, even on silent, RESQ needs Do Not Disturb access. Please enable it in the settings screen that opens.',
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
      setMyUserId(userData.user.id)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id, service_id, responder_permission, responder_emergency_types, admission_number, avatar_url')
        .eq('id', userData.user.id)
        .single()

      if (profileError) return

      setInstitutionId(profile.institution_id)
      setMyServiceId(profile.service_id || null)
      setMyPermission(profile.responder_permission || 'full')
      setMyEmergencyTypes(profile.responder_emergency_types || null)
      await loadEmergencies(profile.institution_id, profile.service_id, profile.responder_emergency_types)

      const { data: institution } = await supabase
        .from('institutions')
        .select('name, logo_url, require_admission_number, require_responder_photo')
        .eq('id', profile.institution_id)
        .single()
      if (institution) {
        setInstitutionName(institution.name || '')
        setInstitutionLogo(institution.logo_url || '')
        setIdentityNeeds({
          admissionNumber: !!institution.require_admission_number && !profile.admission_number,
          photo: !!institution.require_responder_photo && !profile.avatar_url
        })
      }

      // Responders linked to a partner unit, look up its name so the
      // header can tell them plainly which unit they're logged in as,
      // instead of leaving them to guess from the shared queue.
      if (profile.service_id) {
        const { data: service } = await supabase
          .from('institution_services')
          .select('name')
          .eq('id', profile.service_id)
          .single()
        setMyServiceName(service?.name || '')
      }

      // Live updates: any insert/update on emergencies for this institution
      channel = supabase
        .channel('emergencies-feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emergencies', filter: `institution_id=eq.${profile.institution_id}` },
          () => loadEmergencies(profile.institution_id, profile.service_id, profile.responder_emergency_types)
        )
        .subscribe()
    }
    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  // Mirrors admin-dashboard/app/user/page.js's refreshEmergencies: a
  // responder linked to a partner unit (service_id set) only sees
  // emergencies routed to that unit; one whose admin narrowed which
  // types they handle only sees those types. Everyone else sees
  // every open emergency for the institution, unchanged.
  async function loadEmergencies(instId, serviceIdArg, emergencyTypesArg) {
    const { data, error } = await supabase
      .from('emergencies')
      .select('*, claimant:profiles!emergencies_claimed_by_fkey(full_name, phone, service_id, admission_number, avatar_url)')
      .eq('institution_id', instId)
      .in('status', ['triggered', 'claimed', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) {
      setRefreshing(false)
      return
    }

    let list = data || []

    const { data: services } = await supabase
      .from('institution_services')
      .select('id, service_type, lat, lng, handles_emergency_types, is_active')
      .eq('institution_id', instId)
      .eq('is_active', true)
    setInstitutionServicesForRouting(services || [])

    // So a secondary (view-only) responder can see, and call, exactly
    // who is eligible to claim an unclaimed case instead of just
    // watching it sit there.
    const { data: allClaimable } = await supabase
      .from('profiles')
      .select('id, full_name, phone, service_id, responder_emergency_types')
      .eq('institution_id', instId)
      .eq('role', 'responder')
      .eq('responder_permission', 'full')
      .eq('is_active', true)
    setClaimableResponders(allClaimable || [])

    if (serviceIdArg) {
      list = list.filter((emergency) => {
        const matching = pickMatchingServices(services, {
          emergencyType: emergency.emergency_type,
          lat: emergency.lat,
          lng: emergency.lng
        })
        return matching.some((s) => s.id === serviceIdArg)
      })
    } else if (emergencyTypesArg && emergencyTypesArg.length > 0) {
      list = list.filter((emergency) => emergencyTypesArg.includes(emergency.emergency_type))
    }

    setEmergencies(list)
    setRefreshing(false)
  }

  function getEligibleResponders(emergency) {
    const matchingServiceIds = pickMatchingServices(institutionServicesForRouting, {
      emergencyType: emergency.emergency_type,
      lat: emergency.lat,
      lng: emergency.lng
    }).map((s) => s.id)

    return claimableResponders.filter((r) => {
      if (r.service_id) return matchingServiceIds.includes(r.service_id)
      const types = r.responder_emergency_types
      return !types || types.length === 0 || types.includes(emergency.emergency_type)
    })
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    if (institutionId) loadEmergencies(institutionId, myServiceId, myEmergencyTypes)
  }, [institutionId, myServiceId, myEmergencyTypes])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {(identityNeeds.admissionNumber || identityNeeds.photo) && (
        <IdentityPrompt
          userId={myUserId}
          role="responder"
          needsAdmissionNumber={identityNeeds.admissionNumber}
          needsPhoto={identityNeeds.photo}
          onDone={() => setIdentityNeeds({ admissionNumber: false, photo: false })}
        />
      )}
      {hasUnclaimed && (
        <View style={styles.sirenBanner}>
          <Text style={styles.sirenText}>🚨 Unclaimed emergency, respond now</Text>
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
          {!!myServiceName && (
            <Text style={styles.roleBadge} numberOfLines={1}>🏥 Partner unit: {myServiceName}</Text>
          )}
          {myPermission === 'view_only' && (
            <Text style={styles.viewOnlyBadge}>👁️ Secondary responder: cannot claim</Text>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {!item.claimed_by && item.status === 'triggered' && (
                  <MotiView
                    from={{ opacity: 0.4, scale: 1 }}
                    animate={{ opacity: 1, scale: 1.15 }}
                    transition={{ type: 'timing', duration: 700, loop: true, repeatReverse: true }}
                    style={styles.liveDot}
                  />
                )}
                <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>
                  {STATUS_LABELS[item.status]}
                </Text>
              </View>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
            <Text style={styles.location}>
              {item.lat != null ? `Lat: ${item.lat.toFixed(5)}, Lng: ${item.lng.toFixed(5)}` : `No GPS. Phone: ${item.triggered_by_phone || 'unknown'}`}
            </Text>
            {item.triggered_via !== 'app' && (
              <Text style={styles.badge}>via {item.triggered_via.toUpperCase()}</Text>
            )}
            {item.claimant && (
              <TouchableOpacity disabled={!item.claimant.phone} onPress={() => item.claimant.phone && Linking.openURL(`tel:${item.claimant.phone}`)}>
                <Text style={styles.claimedBy}>
                  ✋ Claimed by {item.claimant.full_name}{item.claimant.admission_number ? ` (${item.claimant.admission_number})` : ''}
                  {item.claimant.phone ? ` · 📞 ${item.claimant.phone}` : ''}
                </Text>
              </TouchableOpacity>
            )}
            {!item.claimed_by && (() => {
              const eligible = getEligibleResponders(item)
              if (eligible.length === 0) return null
              return (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.eligibleLabel}>Who can claim this:</Text>
                  {eligible.map((r) => (
                    <TouchableOpacity key={r.id} disabled={!r.phone} onPress={() => r.phone && Linking.openURL(`tel:${r.phone}`)}>
                      <Text style={styles.eligibleRow}>{r.full_name}{r.phone ? ` · 📞 ${r.phone}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            })()}
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
  roleBadge: { fontSize: 12, color: '#35d0e8', marginTop: 3, fontWeight: '600' },
  viewOnlyBadge: { fontSize: 12, color: '#e0b34d', marginTop: 3, fontWeight: '600' },
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
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff2b2b' },
  time: { color: '#5c6480' },
  location: { color: '#9aa4bf' },
  badge: { marginTop: 6, fontSize: 12, color: '#e0b34d', fontWeight: 'bold' },
  claimedBy: { marginTop: 6, fontSize: 12, color: '#35d0e8', fontWeight: '600' },
  eligibleLabel: { fontSize: 11, color: '#e0b34d', fontWeight: '700' },
  eligibleRow: { fontSize: 12, color: '#e0b34d', marginTop: 2 }
})
