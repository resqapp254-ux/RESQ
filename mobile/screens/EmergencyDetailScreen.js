// screens/EmergencyDetailScreen.js
// Responder view of a single emergency: claim it, see the exact
// location, call the person, update status, and chat live.

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Linking, Alert, Platform, Image, Keyboard
} from 'react-native'
import { useAudioPlayer } from 'expo-audio'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

const EMERGENCY_TYPE_LABELS = {
  medical: '🏥 Medical',
  fire: '🔥 Fire',
  accident: '🚑 Accident',
  security: '🛡️ Security',
  gbv: '🤝 GBV',
  mental_health: '🧠 Mental Health',
  property_damage: '🏚️ Property Damage',
  other: '⚠️ Other'
}

export default function EmergencyDetailScreen({ route, navigation }) {
  const { emergencyId } = route.params
  const [emergency, setEmergency] = useState(null)
  const [triggeredByProfile, setTriggeredByProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [myId, setMyId] = useState(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const listRef = useRef(null)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    let emergencyChannel, messageChannel

    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setMyId(userData.user.id)

      emergencyChannel = supabase
        .channel(`emergency-${emergencyId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `id=eq.${emergencyId}` },
          (payload) => setEmergency(payload.new)
        )
        .subscribe()

      messageChannel = supabase
        .channel(`emergency-messages-${emergencyId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'emergency_messages', filter: `emergency_id=eq.${emergencyId}` },
          (payload) => setMessages((prev) => [...prev, payload.new])
        )
        .subscribe()

      await loadEmergency()
      await loadMessages()
    }
    init()

    return () => {
      if (emergencyChannel) supabase.removeChannel(emergencyChannel)
      if (messageChannel) supabase.removeChannel(messageChannel)
    }
  }, [emergencyId])

  async function loadEmergency() {
    const { data, error } = await supabase.from('emergencies').select('*').eq('id', emergencyId).single()
    console.log('EMERGENCY LOAD:', JSON.stringify({ error, triggered_by: data?.triggered_by, triggered_by_phone: data?.triggered_by_phone, photo_url: data?.photo_url }))
    if (!error) {
      setEmergency(data)
      if (data.triggered_by) {
        const { data: prof, error: profError } = await supabase.from('profiles').select('full_name, phone').eq('id', data.triggered_by).single()
        console.log('TRIGGERED-BY PROFILE FETCH:', JSON.stringify({ prof, profError }))
        setTriggeredByProfile(prof)
      } else {
        // USSD/SMS-triggered — no app account, just a raw phone number
        setTriggeredByProfile({ full_name: `Phone caller (no app account)`, phone: data.triggered_by_phone })
      }
    }
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from('emergency_messages')
      .select('*')
      .eq('emergency_id', emergencyId)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data)
  }

  async function handleClaim() {
    const { data, error } = await supabase
      .from('emergencies')
      .update({ status: 'claimed', claimed_by: myId, claimed_at: new Date().toISOString() })
      .eq('id', emergencyId)
      .eq('status', 'triggered') // prevents double-claiming a race condition
      .select()

    if (error) {
      Alert.alert('Could not claim', error.message)
      return
    }

    if (!data || data.length === 0) {
      Alert.alert('Already claimed', 'Another responder just claimed this emergency first.')
      await loadEmergency()
      return
    }

    await loadEmergency()
  }

  async function updateStatus(newStatus) {
    if (newStatus === 'resolved') {
      // Goes through the server so we can also email the institution admin
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const res = await fetch(`${API_BASE_URL}/api/emergency/mark-resolved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
          body: JSON.stringify({ emergencyId })
        })
        const data = await res.json()
        if (!data.success) {
          Alert.alert('Update failed', data.error || 'Unknown error')
          return
        }
      } catch (err) {
        Alert.alert('Update failed', err.message)
        return
      }
      await loadEmergency()
      return
    }

    const { error } = await supabase.from('emergencies').update({ status: newStatus }).eq('id', emergencyId)
    if (error) {
      Alert.alert('Update failed', error.message)
      return
    }
    await loadEmergency()
  }

  function openInMaps() {
    if (!emergency || emergency.lat == null || emergency.lng == null) {
      Alert.alert('No location available', 'This emergency was triggered without GPS (likely via USSD/SMS). Use the phone number to reach them instead.')
      return
    }
    const url = `https://www.google.com/maps?q=${emergency.lat},${emergency.lng}`
    Linking.openURL(url)
  }

  function callUser() {
    if (!triggeredByProfile?.phone) {
      Alert.alert('No phone number on file for this user.')
      return
    }
    Linking.openURL(`tel:${triggeredByProfile.phone}`)
  }

  async function sendMessage() {
    if (!messageText.trim()) return
    const text = messageText.trim()
    setMessageText('')

    const { error } = await supabase.from('emergency_messages').insert({
      emergency_id: emergencyId,
      sender_id: myId,
      sender_role: 'responder',
      message: text
    })

    if (error) {
      Alert.alert('Failed to send', error.message)
      return
    }

    // Non-blocking safety check on what was just sent
    const { data: sessionData } = await supabase.auth.getSession()
    fetch(`${API_BASE_URL}/api/emergency/check-responder-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
      body: JSON.stringify({ emergencyId, message: text })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.flagged) loadEmergency() // refresh to pick up the new ai_flag_to_responder
      })
      .catch(() => {})
  }

  const voiceNotePlayer = useAudioPlayer(emergency?.voice_note_url ? { uri: emergency.voice_note_url } : null)

  if (!emergency) {
    return <View style={styles.container}><Text style={{ color: '#9aa4bf' }}>Loading...</Text></View>
  }

  const isMine = emergency.claimed_by === myId
  const isUnclaimed = emergency.status === 'triggered'
  const typeLabel = EMERGENCY_TYPE_LABELS[emergency.emergency_type] || EMERGENCY_TYPE_LABELS.other

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.status}>{emergency.status.toUpperCase().replace('_', ' ')}</Text>
      </View>

      <View style={styles.typeBadge}>
        <Text style={styles.typeBadgeText}>{typeLabel}</Text>
      </View>

      <Text style={styles.person}>
        Triggered by: {triggeredByProfile?.full_name || 'Unknown'}
        {triggeredByProfile?.phone ? ` · ${triggeredByProfile.phone}` : ' · No phone on file'}
      </Text>

      {emergency.photo_url && (
        <View style={styles.photoBox}>
          <Text style={styles.photoLabel}>Photo from the scene:</Text>
          <Image source={{ uri: emergency.photo_url }} style={styles.photo} resizeMode="cover" />
        </View>
      )}

      {emergency.video_url && (
        <TouchableOpacity style={styles.mediaLinkButton} onPress={() => Linking.openURL(emergency.video_url)}>
          <Text style={styles.mediaLinkText}>🎥 View video from the scene</Text>
        </TouchableOpacity>
      )}

      {emergency.voice_note_url && (
        <TouchableOpacity style={styles.mediaLinkButton} onPress={() => voiceNotePlayer.play()}>
          <Text style={styles.mediaLinkText}>▶️ Play voice note</Text>
        </TouchableOpacity>
      )}

      {emergency.ai_advice_to_user && (
        <View style={styles.aiBox}>
          <Text style={styles.aiLabel}>AI advice sent to user:</Text>
          <Text style={styles.aiText}>{emergency.ai_advice_to_user}</Text>
        </View>
      )}
      {emergency.ai_flag_to_responder && (
        <View style={styles.aiWarnBox}>
          <Text style={styles.aiWarnLabel}>⚠ AI Flag:</Text>
          <Text style={styles.aiText}>{emergency.ai_flag_to_responder}</Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={openInMaps}>
          <Text style={styles.actionButtonText}>📍 View Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={callUser}>
          <Text style={styles.actionButtonText}>📞 Call</Text>
        </TouchableOpacity>
      </View>

      {isUnclaimed && (
        <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
          <Text style={styles.claimButtonText}>Claim This Emergency</Text>
        </TouchableOpacity>
      )}

      {isMine && emergency.status === 'claimed' && (
        <TouchableOpacity style={styles.progressButton} onPress={() => updateStatus('in_progress')}>
          <Text style={styles.claimButtonText}>Mark In Progress</Text>
        </TouchableOpacity>
      )}

      {isMine && emergency.status === 'in_progress' && (
        <TouchableOpacity style={styles.resolveButton} onPress={() => updateStatus('resolved')}>
          <Text style={styles.claimButtonText}>Mark Resolved</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.chatHeader}>Chat</Text>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_id === myId ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={item.sender_id === myId ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.message}</Text>
          </View>
        )}
      />

      {isMine ? (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            placeholderTextColor="#5c6480"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={{ color: 'white' }}>Send</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.chatNotice}>Claim this emergency before sending messages.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#05070d' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#f4f6fb' },
  status: { fontWeight: 'bold', color: '#ff2b2b' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, marginTop: 8 },
  chatNotice: { color: '#9aa4bf', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  typeBadgeText: { fontWeight: 'bold', fontSize: 13, color: '#f4f6fb' },
  person: { marginTop: 8, marginBottom: 8, color: '#9aa4bf' },
  photoBox: { marginBottom: 10 },
  mediaLinkButton: { backgroundColor: 'rgba(53,208,232,0.12)', borderWidth: 1, borderColor: 'rgba(53,208,232,0.3)', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 10 },
  mediaLinkText: { color: '#35d0e8', fontWeight: '600' },
  photoLabel: { fontWeight: 'bold', fontSize: 12, color: '#9aa4bf', marginBottom: 6 },
  photo: { width: '100%', height: 200, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
  aiBox: { backgroundColor: 'rgba(53,208,232,0.1)', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(53,208,232,0.25)' },
  aiLabel: { fontWeight: 'bold', fontSize: 12, color: '#35d0e8' },
  aiWarnBox: { backgroundColor: 'rgba(224,179,77,0.12)', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(224,179,77,0.3)' },
  aiWarnLabel: { fontWeight: 'bold', fontSize: 12, color: '#e0b34d' },
  aiText: { marginTop: 4, color: '#f4f6fb' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontWeight: 'bold', color: '#f4f6fb' },
  claimButton: { backgroundColor: '#cc0000', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  progressButton: { backgroundColor: '#35d0e8', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  resolveButton: { backgroundColor: '#3fe08a', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  claimButtonText: { color: 'white', fontWeight: 'bold' },
  chatHeader: { fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#f4f6fb' },
  chatList: { flex: 1 },
  bubble: { padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  bubbleMine: { backgroundColor: '#cc0000', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start' },
  bubbleTextMine: { color: 'white' },
  bubbleTextTheirs: { color: '#f4f6fb' },
  inputRow: { flexDirection: 'row', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 10, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#f4f6fb' },
  sendButton: { backgroundColor: '#cc0000', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }
})