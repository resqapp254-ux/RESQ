// screens/EmergencyHistoryDetailScreen.js
// Read-only chat for a past (resolved) emergency — nothing to send to
// once it's resolved, just the record of what was exchanged.

import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAudioPlayer } from 'expo-audio'
import { supabase } from '../lib/supabase'

function VoiceMessageBubble({ uri, textStyle }) {
  const player = useAudioPlayer(uri)
  return (
    <TouchableOpacity onPress={() => { player.seekTo(0); player.play() }}>
      <Text style={textStyle}>▶️ Voice note</Text>
    </TouchableOpacity>
  )
}

export default function EmergencyHistoryDetailScreen({ route }) {
  const { emergencyId } = route.params
  const [messages, setMessages] = useState([])
  const [myId, setMyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      setMyId(userData.user?.id)

      const { data } = await supabase
        .from('emergency_messages')
        .select('id, sender_id, sender_role, message, created_at, media_url, media_type')
        .eq('emergency_id', emergencyId)
        .order('created_at', { ascending: true })
        .limit(200)
      setMessages(data || [])
      setLoading(false)
    }
    load()
  }, [emergencyId])

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading && <Text style={styles.notice}>Loading chat…</Text>}
      {!loading && messages.length === 0 && <Text style={styles.notice}>No messages were exchanged for this emergency.</Text>}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const mine = item.sender_id === myId
          const bubbleStyle = mine ? styles.mineBubble : styles.theirBubble
          const textStyle = mine ? styles.mineText : styles.theirText
          return (
            <View style={[styles.bubble, bubbleStyle]}>
              <Text style={styles.senderLabel}>{item.sender_role} · {new Date(item.created_at).toLocaleString()}</Text>
              {item.media_type === 'photo' && item.media_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.media_url)}>
                  <Text style={textStyle}>📷 Photo — tap to view</Text>
                </TouchableOpacity>
              ) : item.media_type === 'video' && item.media_url ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.media_url)}>
                  <Text style={textStyle}>🎥 Video — tap to view</Text>
                </TouchableOpacity>
              ) : item.media_type === 'voice' && item.media_url ? (
                <VoiceMessageBubble uri={item.media_url} textStyle={textStyle} />
              ) : (
                <Text style={textStyle}>{item.message}</Text>
              )}
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  notice: { color: '#9aa4bf', fontSize: 13, textAlign: 'center', padding: 20 },
  bubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 8 },
  mineBubble: { backgroundColor: 'rgba(255,43,43,0.18)', alignSelf: 'flex-end' },
  theirBubble: { backgroundColor: 'rgba(255,255,255,0.07)', alignSelf: 'flex-start' },
  senderLabel: { color: '#9aa4bf', fontSize: 10, marginBottom: 2, textTransform: 'capitalize' },
  mineText: { color: '#fff' },
  theirText: { color: '#f4f6fb' }
})
