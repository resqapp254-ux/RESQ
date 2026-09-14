// screens/UserEmergencyActiveScreen.js
// Shown after a user triggers an emergency. Shows AI advice
// immediately, then live status updates as a responder claims
// and works the case, plus a chat channel with that responder.

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Linking, Alert, Platform, Keyboard
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
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const listRef = useRef(null)
  const locationWatchRef = useRef(null)
  const advicePollRef = useRef(null)

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

      // Set up realtime FIRST, before loading anything — so we never
      // miss an update that lands while we're still fetching/rendering.
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

      await loadEmergency()
      await loadMessages()
      startLocationUpdates()
      startAdvicePollFallback()
    }
    init()

    return () => {
      if (emergencyChannel) supabase.removeChannel(emergencyChannel)
      if (messageChannel) supabase.removeChannel(messageChannel)
      if (locationWatchRef.current) locationWatchRef.current.remove()
      if (advicePollRef.current) clearInterval(advicePollRef.current)
    }
  }, [emergencyId])

  // Belt-and-braces fallback: realtime *should* deliver the AI advice
  // update, but if that update lands before our subscription finishes
  // connecting, the event gets missed entirely. Poll every 2s until
  // advice shows up (or give up after 30s so we're not polling forever
  // if generate-advice genuinely failed).
  function startAdvicePollFallback() {
    let attempts = 0
    advicePollRef.current = setInterval(async () => {
      attempts += 1
      const { data } = await supabase
        .from('emergencies')
        .select('ai_advice_to_user')
        .eq('id', emergencyId)
        .single()

      if (data?.ai_advice_to_user) {
        setEmergency((prev) => (prev ? { ...prev, ai_advice_to_user: data.ai_advice_to_user } : prev))
        clearInterval(advicePollRef.current)
      } else if (attempts >= 15) {
        clearInterval(advicePollRef.current)
      }
    }, 2000)
  }

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
    return <View style={styles.container}><Text style={{ color: '#9aa4bf' }}>Loading...</Text></View>
  }

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
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
          placeholderTextColor="#5c6480"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#05070d' },
  statusHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#ff2b2b' },
  aiBox: { backgroundColor: 'rgba(53,208,232,0.1)', padding: 14, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(53,208,232,0.25)' },
  aiLabel: { fontWeight: 'bold', fontSize: 12, color: '#35d0e8', marginBottom: 4 },
  aiText: { fontSize: 15, lineHeight: 20, color: '#f4f6fb' },
  responderBox: { backgroundColor: 'rgba(63,224,138,0.1)', padding: 14, borderRadius: 10, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(63,224,138,0.25)' },
  responderName: { fontWeight: 'bold', color: '#f4f6fb' },
  callButton: { backgroundColor: '#3fe08a', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  callButtonText: { color: '#05070d', fontWeight: 'bold' },
  chatHeader: { fontWeight: 'bold', marginTop: 4, marginBottom: 4, color: '#f4f6fb' },
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