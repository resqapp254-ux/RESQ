// screens/EmergencyDetailScreen.js
// Responder view of a single emergency: claim it, see the exact
// location, call the person, update status, and chat live.

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Linking, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { supabase } from '../lib/supabase'

export default function EmergencyDetailScreen({ route, navigation }) {
  const { emergencyId } = route.params
  const [emergency, setEmergency] = useState(null)
  const [triggeredByProfile, setTriggeredByProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [myId, setMyId] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    let emergencyChannel, messageChannel

    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setMyId(userData.user.id)

      await loadEmergency()
      await loadMessages()

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
    }
    init()

    return () => {
      if (emergencyChannel) supabase.removeChannel(emergencyChannel)
      if (messageChannel) supabase.removeChannel(messageChannel)
    }
  }, [emergencyId])

  async function loadEmergency() {
    const { data, error } = await supabase.from('emergencies').select('*').eq('id', emergencyId).single()
    if (!error) {
      setEmergency(data)
      if (data.triggered_by) {
        const { data: prof } = await supabase.from('profiles').select('full_name, phone').eq('id', data.triggered_by).single()
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
    const updates = { status: newStatus }
    if (newStatus === 'resolved') updates.resolved_at = new Date().toISOString()

    const { error } = await supabase.from('emergencies').update(updates).eq('id', emergencyId)
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

    if (error) Alert.alert('Failed to send', error.message)
  }

  if (!emergency) {
    return <View style={styles.container}><Text>Loading...</Text></View>
  }

  const isMine = emergency.claimed_by === myId
  const isUnclaimed = emergency.status === 'triggered'

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency</Text>
        <Text style={styles.status}>{emergency.status.toUpperCase().replace('_', ' ')}</Text>
      </View>

      <Text style={styles.person}>Triggered by: {triggeredByProfile?.full_name || 'Unknown'}</Text>

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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fafafa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  status: { fontWeight: 'bold', color: '#cc0000' },
  person: { marginTop: 8, marginBottom: 8, color: '#333' },
  aiBox: { backgroundColor: '#eef6ff', padding: 10, borderRadius: 8, marginBottom: 8 },
  aiLabel: { fontWeight: 'bold', fontSize: 12, color: '#1a5fb4' },
  aiWarnBox: { backgroundColor: '#fff4e5', padding: 10, borderRadius: 8, marginBottom: 8 },
  aiWarnLabel: { fontWeight: 'bold', fontSize: 12, color: '#b8860b' },
  aiText: { marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionButton: { flex: 1, backgroundColor: '#eee', padding: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontWeight: 'bold' },
  claimButton: { backgroundColor: '#cc0000', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  progressButton: { backgroundColor: '#1a5fb4', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  resolveButton: { backgroundColor: '#1a7f37', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  claimButtonText: { color: 'white', fontWeight: 'bold' },
  chatHeader: { fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  chatList: { flex: 1 },
  bubble: { padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  bubbleMine: { backgroundColor: '#cc0000', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: '#e0e0e0', alignSelf: 'flex-start' },
  bubbleTextMine: { color: 'white' },
  bubbleTextTheirs: { color: '#000' },
  inputRow: { flexDirection: 'row', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginRight: 8, backgroundColor: 'white' },
  sendButton: { backgroundColor: '#cc0000', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }
})
