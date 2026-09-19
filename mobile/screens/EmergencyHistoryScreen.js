// screens/EmergencyHistoryScreen.js
// A user's own past (resolved) emergencies — tap one to see its chat.
// Mobile counterpart to the resolved-log "View chat" expander on the
// web dashboard (app/user/page.js) — that existed here as a gap with
// no history view of any kind, not just a different implementation.

import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import EmergencyTypeIcon from '../components/EmergencyTypeIcon'

const TYPE_LABELS = {
  medical: 'Medical', fire: 'Fire', accident: 'Accident', security: 'Security',
  gbv: 'GBV', mental_health: 'Mental Health', property_damage: 'Property Damage', other: 'Other'
}

export default function EmergencyHistoryScreen({ navigation }) {
  const [emergencies, setEmergencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data } = await supabase
      .from('emergencies')
      .select('id, emergency_type, resolved_at, rating')
      .eq('triggered_by', userData.user.id)
      .eq('status', 'resolved')
      .order('resolved_at', { ascending: false })
      .limit(50)

    setEmergencies(data || [])
    setLoading(false)
    setRefreshing(false)
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!loading && emergencies.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No past emergencies yet.</Text>
        </View>
      )}
      <FlatList
        data={emergencies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#ff2b2b" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('EmergencyHistoryDetail', { emergencyId: item.id, emergencyType: item.emergency_type })}
          >
            <View style={styles.row}>
              <EmergencyTypeIcon type={item.emergency_type} size={22} />
              <Text style={styles.typeText}>{TYPE_LABELS[item.emergency_type] || 'Other'}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <Text style={styles.dateText}>
              Resolved {item.resolved_at ? new Date(item.resolved_at).toLocaleString() : 'recently'}
            </Text>
            {item.rating ? (
              <Text style={styles.ratingText}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#9aa4bf', fontSize: 14 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeText: { color: '#f4f6fb', fontWeight: '700', fontSize: 15, flex: 1 },
  chevron: { color: '#5c6480', fontSize: 20 },
  dateText: { color: '#9aa4bf', fontSize: 12, marginTop: 4 },
  ratingText: { color: '#ffd76a', fontSize: 13, marginTop: 6 }
})
