// screens/InstitutionChatScreen.js
// Institution-wide chat for responders and their institution_admin
// to coordinate with each other — separate from the per-emergency
// chat with the person who reported it (see EmergencyDetailScreen).

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function InstitutionChatScreen() {
  const [messages, setMessages] = useState([])
  const [names, setNames] = useState({})
  const [text, setText] = useState('')
  const [myId, setMyId] = useState(null)
  const [institutionId, setInstitutionId] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    let channel
    async function init() {
      const { data: userData } = await supabase.auth.getUser()
      setMyId(userData.user.id)

      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', userData.user.id).single()
      if (!profile?.institution_id) return
      setInstitutionId(profile.institution_id)

      await loadMessages(profile.institution_id)

      channel = supabase
        .channel(`institution-chat-${profile.institution_id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'institution_chat_messages', filter: `institution_id=eq.${profile.institution_id}` },
          async (payload) => {
            setMessages((prev) => (prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
            if (!names[payload.new.sender_id]) {
              const { data: senderProfile } = await supabase.from('profiles').select('full_name').eq('id', payload.new.sender_id).single()
              if (senderProfile) setNames((prev) => ({ ...prev, [payload.new.sender_id]: senderProfile.full_name }))
            }
          }
        )
        .subscribe()
    }
    init()
    return () => {
      if (channel) supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadMessages(instId) {
    const { data } = await supabase
      .from('institution_chat_messages')
      .select('*')
      .eq('institution_id', instId)
      .order('created_at', { ascending: true })
      .limit(200)

    setMessages(data || [])

    const senderIds = [...new Set((data || []).map((m) => m.sender_id))]
    if (senderIds.length > 0) {
      const { data: people } = await supabase.from('profiles').select('id, full_name').in('id', senderIds)
      const map = {}
      for (const p of people || []) map[p.id] = p.full_name
      setNames(map)
    }
  }

  async function sendMessage() {
    const trimmed = text.trim()
    if (!trimmed || !institutionId) return
    setText('')

    await supabase.from('institution_chat_messages').insert({
      institution_id: institutionId,
      sender_id: myId,
      message: trimmed
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender_id === myId ? styles.bubbleMine : styles.bubbleTheirs]}>
              {item.sender_id !== myId && <Text style={styles.senderName}>{names[item.sender_id] || 'Teammate'}</Text>}
              <Text style={item.sender_id === myId ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{item.message}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello to your team.</Text>}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message your team..."
            placeholderTextColor="#5c6480"
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  empty: { color: '#5c6480', textAlign: 'center', marginTop: 40 },
  bubble: { padding: 10, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  bubbleMine: { backgroundColor: '#cc0000', alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start' },
  senderName: { color: '#35d0e8', fontSize: 11, fontWeight: '700', marginBottom: 2 },
  bubbleTextMine: { color: 'white' },
  bubbleTextTheirs: { color: '#f4f6fb' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#f4f6fb'
  },
  sendButton: { backgroundColor: '#cc0000', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' }
})
