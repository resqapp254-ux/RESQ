// screens/UserEmergencyActiveScreen.js
// Shown after a user triggers an emergency. Shows AI advice
// immediately, then live status updates as a responder claims
// and works the case, plus a chat channel with that responder.

import React, { useEffect, useState, useRef } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Linking, Alert, Platform, Image, KeyboardAvoidingView
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { useAudioRecorder, useAudioPlayer, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio'
import { MotiView } from 'moti'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'
import LiveTrackingMap from '../components/LiveTrackingMap'

const STATUS_LABELS = {
  triggered: 'Waiting for a responder...',
  claimed: 'A responder has claimed your emergency',
  in_progress: 'Help is on the way',
  resolved: 'Marked as resolved',
  cancelled: 'Cancelled'
}

// Each voice message gets its own player, so playing one never affects
// another and the same note can be replayed any number of times.
function VoiceMessageBubble({ uri, textStyle }) {
  const player = useAudioPlayer(uri)

  async function handlePlay() {
    try {
      await player.seekTo(0)
      player.play()
    } catch {
      // Ignore — a rare native playback hiccup shouldn't crash the chat
    }
  }

  return (
    <TouchableOpacity onPress={handlePlay}>
      <Text style={textStyle}>▶️ Voice note</Text>
    </TouchableOpacity>
  )
}

export default function UserEmergencyActiveScreen({ route, navigation }) {
  const { emergencyId, routedInstitution: routedInstitutionParam } = route.params
  // Nav params only ever reflect the trigger-time snapshot — never
  // refetched, missing contact/location, and gone entirely if this
  // screen remounts (app restart, deep link back into an active
  // emergency). Refetched from the emergency's own institution_id
  // below instead, with the param as an instant first paint.
  const [routedInstitution, setRoutedInstitution] = useState(routedInstitutionParam || null)
  const [emergency, setEmergency] = useState(null)
  const [responderProfile, setResponderProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState('')
  const [myId, setMyId] = useState(null)
  const listRef = useRef(null)
  const locationWatchRef = useRef(null)
  const advicePollRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [uploadingVoice, setUploadingVoice] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [askingAi, setAskingAi] = useState(false)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const voiceNoteTimeoutRef = useRef(null)

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
          // Dedupe by id — guards against the initial load and this
          // event both delivering the same row.
          (payload) => setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
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
      if (voiceNoteTimeoutRef.current) clearTimeout(voiceNoteTimeoutRef.current)
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
      if (data.institution_id) {
        const { data: inst } = await supabase
          .from('institutions')
          .select('name, logo_url, lat, lng, contact_phone')
          .eq('id', data.institution_id)
          .maybeSingle()
        if (inst) setRoutedInstitution(inst)
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

  function confirmCancel() {
    Alert.alert(
      'Cancel this emergency?',
      'If you cancel, no responder will come to help with this. If you\'re not sure, it\'s safer to wait a little ' +
      'longer instead — a responder may still be on the way.',
      [
        { text: 'Keep waiting', style: 'cancel' },
        { text: 'Cancel emergency', style: 'destructive', onPress: cancelEmergency }
      ]
    )
  }

  async function cancelEmergency() {
    setCancelling(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE_URL}/api/emergency/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify({ emergencyId })
      })
      const data = await res.json()
      if (!data.success) {
        Alert.alert('Could not cancel', data.error || 'Unknown error')
        setCancelling(false)
        return
      }
      navigation.replace('Home')
    } catch (err) {
      Alert.alert('Could not cancel', err.message)
      setCancelling(false)
    }
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

  async function askAi() {
    const question = aiQuestion.trim()
    if (!question) return

    setAskingAi(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const res = await fetch(`${API_BASE_URL}/api/emergency/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` },
        body: JSON.stringify({ emergencyId, question })
      })
      const data = await res.json()
      if (!data.success) {
        Alert.alert('Could not ask AI', data.error || 'Unknown error')
        return
      }
      setAiQuestion('')
      if (!data.answered) {
        Alert.alert('No confident answer', "The AI couldn't confidently answer that — your question is in the chat for a responder to see.")
      }
    } catch (err) {
      Alert.alert('Could not ask AI', err.message)
    } finally {
      setAskingAi(false)
    }
  }

  function confirmReportMessage(item) {
    if (item.sender_id === myId) return
    Alert.alert(
      'Report this message?',
      "This flags the message to your institution admin for review. Use this if it's abusive, inappropriate, or unsafe.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => reportMessage(item) }
      ]
    )
  }

  async function reportMessage(item) {
    try {
      const { error } = await supabase.from('responder_reports').insert({
        institution_id: emergency?.institution_id,
        emergency_id: emergencyId,
        reported_by: myId,
        reported_responder_id: item.sender_id,
        category: 'other',
        message: `Reported chat message: "${(item.message || '[media]').slice(0, 300)}"`
      })
      if (error) throw error
      Alert.alert('Reported', 'Your institution admin has been notified.')
    } catch (err) {
      Alert.alert('Could not report message', err.message)
    }
  }

  async function pickAndSendPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in settings to attach a photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (result.canceled || !result.assets?.[0]) return

    const maxBytes = 10 * 1024 * 1024
    const knownSize = result.assets[0].fileSize ?? (await FileSystem.getInfoAsync(result.assets[0].uri)).size
    if (knownSize > maxBytes) {
      Alert.alert('Photo too large', 'Please choose a photo under 10MB.')
      return
    }

    setUploadingPhoto(true)
    try {
      const asset = result.assets[0]
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
      const arrayBuffer = decode(base64)
      const ext = asset.uri.split('.').pop() || 'jpg'
      const path = `${emergencyId}-chat-photo-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, arrayBuffer, { contentType: asset.mimeType || 'image/jpeg', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('emergency_messages').insert({
        emergency_id: emergencyId,
        sender_id: myId,
        sender_role: 'user',
        message: '📷 Photo',
        media_url: urlData.publicUrl,
        media_type: 'photo'
      })
      if (insertError) throw insertError
    } catch (err) {
      Alert.alert('Could not send photo', err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function pickAndSendVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Video access needed', 'Enable photo/video library access in settings to attach a video.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 0.7 })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const maxBytes = 50 * 1024 * 1024
    const knownSize = asset.fileSize ?? (await FileSystem.getInfoAsync(asset.uri)).size
    if (knownSize > maxBytes) {
      Alert.alert('Video too large', 'Please choose a video under 50MB.')
      return
    }

    setUploadingVideo(true)
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
      const arrayBuffer = decode(base64)
      const ext = asset.uri.split('.').pop() || 'mp4'
      const path = `${emergencyId}-chat-video-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, arrayBuffer, { contentType: asset.mimeType || 'video/mp4', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('emergency_messages').insert({
        emergency_id: emergencyId,
        sender_id: myId,
        sender_role: 'user',
        message: '🎥 Video',
        media_url: urlData.publicUrl,
        media_type: 'video'
      })
      if (insertError) throw insertError
    } catch (err) {
      Alert.alert('Could not send video', err.message)
    } finally {
      setUploadingVideo(false)
    }
  }

  const MAX_VOICE_NOTE_MS = 120000 // 2 minutes — long enough for a real update, short enough no one accidentally records for 20 minutes and eats their data plan uploading it

  async function startVoiceNote() {
    const permission = await AudioModule.requestRecordingPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Microphone access needed', 'Enable microphone access in settings to send a voice note.')
      return
    }
    // Without this, the native audio session is never actually put
    // into a recording-capable mode — record() proceeds with no error,
    // isRecording flips true, but the resulting file is silent because
    // nothing ever engaged the microphone input. Easy to miss since
    // expo-audio doesn't surface it as a thrown error.
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await audioRecorder.prepareToRecordAsync()
    audioRecorder.record()
    setIsRecording(true)
    voiceNoteTimeoutRef.current = setTimeout(() => {
      Alert.alert('Voice note limit reached', 'Recording stopped automatically at 2 minutes.')
      stopVoiceNote()
    }, MAX_VOICE_NOTE_MS)
  }

  async function stopVoiceNote() {
    if (voiceNoteTimeoutRef.current) {
      clearTimeout(voiceNoteTimeoutRef.current)
      voiceNoteTimeoutRef.current = null
    }
    setIsRecording(false)
    await audioRecorder.stop()
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    const uri = audioRecorder.uri
    if (!uri) return

    const fileInfo = await FileSystem.getInfoAsync(uri)
    const maxBytes = 15 * 1024 * 1024 // 15MB safety cap regardless of duration
    if (fileInfo.exists && fileInfo.size > maxBytes) {
      Alert.alert('Voice note too large', 'Please record a shorter message and try again.')
      return
    }

    setUploadingVoice(true)
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 })
      const arrayBuffer = decode(base64)
      // Unique per-recording path — a new voice note is a new message,
      // never a replacement for the last one.
      const path = `${emergencyId}-voice-${Date.now()}.m4a`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, arrayBuffer, { contentType: 'audio/m4a', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('emergency_messages').insert({
        emergency_id: emergencyId,
        sender_id: myId,
        sender_role: 'user',
        message: '🎙️ Voice note',
        media_url: urlData.publicUrl,
        media_type: 'voice'
      })
      if (insertError) throw insertError
      Alert.alert('Voice note sent', 'Your responder can now play it back.')
    } catch (err) {
      Alert.alert('Could not send voice note', err.message)
    } finally {
      setUploadingVoice(false)
    }
  }

  if (!emergency) {
    return <View style={styles.container}><Text style={{ color: '#9aa4bf' }}>Loading...</Text></View>
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!['resolved', 'cancelled'].includes(emergency.status) && (
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ type: 'timing', duration: 900, loop: true, repeatReverse: true }}
            style={styles.liveDot}
          />
        )}
        <Text style={styles.statusHeader}>{STATUS_LABELS[emergency.status]}</Text>
      </View>

      {emergency.lat != null && emergency.lng != null && (
        <View style={{ marginBottom: 12 }}>
          <LiveTrackingMap lat={emergency.lat} lng={emergency.lng} />
        </View>
      )}

      {!['resolved', 'cancelled'].includes(emergency.status) && (
        <TouchableOpacity style={styles.cancelButton} onPress={confirmCancel} disabled={cancelling}>
          <Text style={styles.cancelButtonText}>{cancelling ? 'Cancelling…' : '✕ Cancel this emergency'}</Text>
        </TouchableOpacity>
      )}

      {routedInstitution?.name && (
        <View style={styles.routedBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {routedInstitution.logo_url && (
              <Image source={{ uri: routedInstitution.logo_url }} style={styles.routedLogo} />
            )}
            <Text style={styles.routedText}>Routed to {routedInstitution.name} — they will respond to you.</Text>
          </View>
          {routedInstitution.contact_phone && (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${routedInstitution.contact_phone}`)}>
              <Text style={styles.routedCallLink}>📞 Call {routedInstitution.name}: {routedInstitution.contact_phone}</Text>
            </TouchableOpacity>
          )}
          {routedInstitution.lat != null && routedInstitution.lng != null && (
            <View style={{ marginTop: 10 }}>
              <LiveTrackingMap lat={routedInstitution.lat} lng={routedInstitution.lng} height={140} />
            </View>
          )}
        </View>
      )}

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
        renderItem={({ item }) => {
          const mine = item.sender_id === myId
          const bubbleStyle = mine ? styles.bubbleMine : styles.bubbleTheirs
          const textStyle = mine ? styles.bubbleTextMine : styles.bubbleTextTheirs
          return (
            <TouchableOpacity
              style={[styles.bubble, bubbleStyle]}
              activeOpacity={mine ? 1 : 0.7}
              onLongPress={mine ? undefined : () => confirmReportMessage(item)}
              delayLongPress={400}
            >
              {item.media_type === 'photo' && item.media_url ? (
                <Image source={{ uri: item.media_url }} style={styles.chatPhoto} resizeMode="cover" />
              ) : item.media_type === 'voice' && item.media_url ? (
                <VoiceMessageBubble uri={item.media_url} textStyle={textStyle} />
              ) : item.media_type === 'video' && item.media_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.media_url)}>
                  <Text style={textStyle}>🎥 Video message — tap to view</Text>
                </TouchableOpacity>
              ) : (
                <Text style={textStyle}>{item.message}</Text>
              )}
              {!mine && <Text style={styles.reportHint}>Hold to report</Text>}
            </TouchableOpacity>
          )
        }}
      />

      <View style={styles.aiRow}>
        <TextInput
          style={styles.aiInput}
          value={aiQuestion}
          onChangeText={setAiQuestion}
          placeholder="🤖 Ask AI a quick question while you wait…"
          placeholderTextColor="#5c6480"
          onSubmitEditing={askAi}
        />
        <TouchableOpacity style={styles.aiButton} onPress={askAi} disabled={askingAi || !aiQuestion.trim()}>
          <Text style={{ color: 'white', fontSize: 12 }}>{askingAi ? '…' : 'Ask'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.photoButton} onPress={pickAndSendPhoto} disabled={uploadingPhoto}>
          <Text style={{ fontSize: 16 }}>{uploadingPhoto ? '⏳' : '📷'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoButton} onPress={pickAndSendVideo} disabled={uploadingVideo}>
          <Text style={{ fontSize: 16 }}>{uploadingVideo ? '⏳' : '🎥'}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Message your responder..."
          placeholderTextColor="#5c6480"
        />
        <TouchableOpacity
          style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
          onPress={isRecording ? stopVoiceNote : startVoiceNote}
          disabled={uploadingVoice}
        >
          <Text style={{ fontSize: 16 }}>{uploadingVoice ? '⏳' : isRecording ? '⏹' : '🎙️'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={{ color: 'white' }}>Send</Text>
        </TouchableOpacity>
      </View>
      {isRecording && <Text style={styles.recordingNotice}>Recording voice note… tap ⏹ to send</Text>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#05070d' },
  statusHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#ff2b2b' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff2b2b', marginBottom: 12 },
  cancelButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,128,128,0.4)', marginBottom: 12 },
  cancelButtonText: { color: '#ff8080', fontSize: 12, fontWeight: '600' },
  routedBox: { backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  routedLogo: { width: 28, height: 28, borderRadius: 6, marginRight: 10 },
  routedText: { color: '#f4f6fb', fontSize: 13, flex: 1 },
  routedCallLink: { color: '#7fe3f2', fontSize: 12, marginTop: 8 },
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
  reportHint: { color: '#5c6480', fontSize: 9, marginTop: 3 },
  chatPhoto: { width: 180, height: 180, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  inputRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  aiRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  aiInput: { flex: 1, borderWidth: 1, borderColor: 'rgba(53,208,232,0.3)', borderRadius: 8, padding: 8, marginRight: 8, backgroundColor: 'rgba(53,208,232,0.06)', color: '#f4f6fb', fontSize: 13 },
  aiButton: { backgroundColor: '#35d0e8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: 10, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)', color: '#f4f6fb' },
  sendButton: { backgroundColor: '#cc0000', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  photoButton: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', marginRight: 8 },
  voiceButton: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', marginRight: 8 },
  voiceButtonActive: { backgroundColor: 'rgba(255,43,43,0.3)' },
  recordingNotice: { color: '#ff8080', fontSize: 12, textAlign: 'center', marginTop: 6 }
})
