// screens/MyInstitutionsScreen.js
// Lets a user toggle between a public account (no institution, routes
// to the nearest public institution) and a private one, switch
// between institutions they've already joined without re-entering a
// code, and join an additional institution by code. Mirrors
// admin-dashboard/components/MyInstitutionsPanel.js on web.

import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function MyInstitutionsScreen({ navigation }) {
  const [mode, setMode] = useState('private')
  const [activeInstitutionId, setActiveInstitutionId] = useState('')
  const [institutions, setInstitutions] = useState([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_mode, institution_id')
      .eq('id', userData.user.id)
      .single()

    setMode(profile?.account_mode || 'private')
    setActiveInstitutionId(profile?.institution_id || '')

    const { data: links } = await supabase
      .from('user_institutions')
      .select('institution_id, institutions(id, name)')
      .order('added_at', { ascending: true })

    setInstitutions((links || []).map((l) => l.institutions).filter(Boolean))
    setLoaded(true)
  }

  async function handleGoPublic() {
    setBusy(true)
    const { data, error } = await supabase.rpc('set_account_mode', { mode: 'public' })
    setBusy(false)
    if (error || !data?.success) {
      Alert.alert('Could not switch', data?.error || error?.message || 'Unknown error')
      return
    }
    await load()
  }

  async function handleGoPrivate() {
    setBusy(true)
    const { data, error } = await supabase.rpc('set_account_mode', { mode: 'private' })
    setBusy(false)
    if (error || !data?.success) {
      Alert.alert('Could not switch', data?.error || error?.message || 'Join an institution by code first')
      return
    }
    await load()
  }

  async function handleSwitch(institutionId) {
    setBusy(true)
    const { data, error } = await supabase.rpc('switch_active_institution', { target_institution_id: institutionId })
    setBusy(false)
    if (error || !data?.success) {
      Alert.alert('Could not switch', data?.error || error?.message || 'Unknown error')
      return
    }
    await load()
  }

  async function handleAddCode() {
    if (!code.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('join_institution_by_code', { code: code.trim().toUpperCase() })
    setBusy(false)
    if (error || !data?.success) {
      Alert.alert('Could not join', data?.error || error?.message || 'Unknown error')
      return
    }
    setCode('')
    await load()
    Alert.alert('Connected', `You're now linked to ${data.institution_name}.`)
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ActivityIndicator style={{ marginTop: 40 }} color="#ff2b2b" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.title}>My Institutions</Text>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'private' && styles.modeButtonActive]}
            onPress={handleGoPrivate}
            disabled={busy || mode === 'private'}
          >
            <Text style={[styles.modeButtonText, mode === 'private' && styles.modeButtonTextActive]}>Connected to an institution</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'public' && styles.modeButtonActive]}
            onPress={handleGoPublic}
            disabled={busy || mode === 'public'}
          >
            <Text style={[styles.modeButtonText, mode === 'public' && styles.modeButtonTextActive]}>General public</Text>
          </TouchableOpacity>
        </View>

        {mode === 'private' && institutions.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.subtle}>Switch which institution is active:</Text>
            {institutions.map((inst) => (
              <TouchableOpacity
                key={inst.id}
                style={[styles.instRow, inst.id === activeInstitutionId && styles.instRowActive]}
                onPress={() => handleSwitch(inst.id)}
                disabled={busy || inst.id === activeInstitutionId}
              >
                <Text style={styles.instRowText}>{inst.id === activeInstitutionId ? '✓ ' : ''}{inst.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.subtle}>Add another institution by code:</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <TextInput
            style={styles.input}
            placeholder="RESQ-AB12CD"
            placeholderTextColor="#5c6480"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddCode} disabled={busy}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#f4f6fb', marginBottom: 16 },
  subtle: { color: '#9aa4bf', fontSize: 13, marginBottom: 6 },
  modeRow: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#cc0000' },
  modeButtonText: { color: '#9aa4bf', fontWeight: '600', fontSize: 12 },
  modeButtonTextActive: { color: '#fff' },
  instRow: { padding: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  instRowActive: { borderColor: '#35d0e8' },
  instRowText: { color: '#f4f6fb' },
  input: { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f4f6fb', borderRadius: 10, padding: 12 },
  addButton: { backgroundColor: '#cc0000', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' }
})
