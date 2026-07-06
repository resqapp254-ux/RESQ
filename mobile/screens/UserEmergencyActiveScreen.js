// screens/UserEmergencyActiveScreen.js
// Shown after a user triggers an emergency. Shows AI advice
// immediately, then live status updates as a responder claims
// and works the case, plus a chat channel with that responder.

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Linking, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import * as Location from 'expo-location'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = {
  triggered: 'Waiting for a responder...',
  claimed: 'A responder has claimed your emergency',
  in_progress: 'Help is on the way',
  resolved: 'Marked as resolved',
  cancelled: 'Cancelled'
}

export default function UserEmergencyActiveScreen({ route, navigation }) {
  const { emergencyId } = route.params
  const [emergency, setEmergency] = useState(null)
  const [responderProfile, setResponderProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [myId, setMyId] = useState(null)
  const listRef = useRef(null)
  const locationWatchRef = useRef(null)

  useEffect(() => {
    let emergencyChannel, messageChannel

    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setMyId(userData.user.id)

      await loadEmergency()
      await loadMessages()
      startLocationUpdates()

      emergencyChannel = supabase
        .channel(`user-emergency-${emergencyId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `id=eq.${emergencyId}` },
          async (payload) => {
            setEmergency(payload.new)
            if (payload.new.claimed_by && payload.new.claimed_by !== responderProfile?.id) {
              const { data: resp } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .eq('id', payload.new.claimed_by)
                .single()
              setResponderProfile(resp)
            }
          }
        )
        .subscribe()

      messageChannel = supabase
        .channel(`user-emergency-messages-${emergencyId}`)
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
      if (locationWatchRef.current) locationWatchRef.current.remove()
    }
  }, [emergencyId])

  async function loadEmergency() {
    const { data, error } = await supabase.from('emergencies').select('*').eq('id', emergencyId).single()
    if (!error) {
      setEmergency(data)
      if (data.claimed_by) {
        const { data: resp } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', data.claimed_by)
          .single()
        setResponderProfile(resp)
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

  async function startLocationUpdates() {
    // Keep sending fresh location every ~15 seconds while the emergency is active
    locationWatchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 10 },
      async (position) => {
        await supabase
          .from('emergencies')
          .update({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            location_updated_at: new Date().toISOString()
          })
          .eq('id', emergencyId)
      }
    )
  }

  function callResponder() {
    if (!responderProfile?.phone) {
      Alert.alert('No phone number available for this responder yet.')
      return
    }
    Linking.openURL(`tel:${responderProfile.phone}`)
  }

  async function sendMessage() {
    if (!messageText.trim()) return
    const text = messageText.trim()
    setMessageText('')

    const { error } = await supabase.from('emergency_messages').insert({
      emergency_id: emergencyId,
      sender_id: myId,
      sender_role: 'user',
      message: text
    })

    if (error) Alert.alert('Failed to send', error.message)
  }

  if (!emergency) {
    return <View style={styles.container}><Text>Loading...</Text></View>
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.statusHeader}>{STATUS_LABELS[emergency.status]}</Text>

      {emergency.ai_advice_to_user ? (
        <View style={styles.aiBox}>
          <Text style={styles.aiLabel}>Immediate guidance:</Text>
          <Text style={styles.aiText}>{emergency.ai_advice_to_user}</Text>
        </View>
      ) : (
        <View style={styles.aiBox}>
          <Text style={styles.aiText}>Getting guidance for you...</Text>
        </View>
      )}

      {responderProfile && (
        <View style={styles.responderBox}>
          <Text style={styles.responderName}>Responder: {responderProfile.full_name}</Text>
          <TouchableOpacity style={styles.callButton} onPress={callResponder}>
            <Text style={styles.callButtonText}>📞 Call Responder</Text>
          </TouchableOpacity>
        </View>
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
          placeholder="Message your responder..."
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
  statusHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#cc0000' },
  aiBox: { backgroundColor: '#eef6ff', padding: 14, borderRadius: 10, marginBottom: 12 },
  aiLabel: { fontWeight: 'bold', fontSize: 12, color: '#1a5fb4', marginBottom: 4 },
  aiText: { fontSize: 15, lineHeight: 20 },
  responderBox: { backgroundColor: '#f0fdf4', padding: 14, borderRadius: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  responderName: { fontWeight: 'bold' },
  callButton: { backgroundColor: '#1a7f37', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  callButtonText: { color: 'white', fontWeight: 'bold' },
  chatHeader: { fontWeight: 'bold', marginTop: 4, marginBottom: 4 },
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
