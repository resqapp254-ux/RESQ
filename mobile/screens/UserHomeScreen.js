// screens/UserHomeScreen.js
// The core of the user side: pick what's wrong, optionally attach
// a photo, then press the big button to send an emergency with the
// user's live location, routing them to the active-emergency screen.

import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

const EMERGENCY_TYPES = [
  { key: 'medical', label: 'Medical', emoji: '🏥', color: '#ff5252' },
  { key: 'fire', label: 'Fire', emoji: '🔥', color: '#ff8a3d' },
  { key: 'accident', label: 'Accident', emoji: '🚑', color: '#ffca3d' },
  { key: 'security', label: 'Security', emoji: '🛡️', color: '#35d0e8' },
  { key: 'gbv', label: 'GBV', emoji: '🤝', color: '#c084fc' },
  { key: 'mental_health', label: 'Mental Health', emoji: '🧠', color: '#7f9cf5' },
  { key: 'property_damage', label: 'Property Damage', emoji: '🏚️', color: '#8d99ae' },
  { key: 'other', label: 'Other', emoji: '⚠️', color: '#e0b34d' }
]

export default function UserHomeScreen({ navigation }) {
  const [sending, setSending] = useState(false)
  const [selectedType, setSelectedType] = useState('other')
  const [photo, setPhoto] = useState(null) // { uri }
  const [enabledTypes, setEnabledTypes] = useState(null)

  useEffect(() => {
    async function loadEnabledTypes() {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return
      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', userData.user.id).single()
      if (!profile?.institution_id) return
      const { data: institution } = await supabase.from('institutions').select('enabled_emergency_types').eq('id', profile.institution_id).single()
      if (institution?.enabled_emergency_types?.length) setEnabledTypes(institution.enabled_emergency_types)
    }
    loadEnabledTypes()
  }, [])

  const visibleTypes = EMERGENCY_TYPES.filter((t) => !enabledTypes || enabledTypes.includes(t.key))

  async function handleAttachPhoto() {
    Alert.alert('Attach a photo', 'Optional — a photo of the situation can help responders.', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' }
    ])
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Enable camera access in settings to attach a photo.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 })
    if (!result.canceled) setPhoto(result.assets[0])
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Photo access needed', 'Enable photo library access in settings to attach a photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.5 })
    if (!result.canceled) setPhoto(result.assets[0])
  }

  async function uploadPhoto(emergencyId) {
    try {
      const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 })
      const arrayBuffer = decode(base64)
      const path = `${emergencyId}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true })
      if (uploadError) return

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)

      await supabase
        .from('emergencies')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', emergencyId)
    } catch {
      // Best-effort — the emergency itself was already created and
      // dispatched; a failed evidence photo shouldn't surface an error.
    }
  }

  async function handleTriggerEmergency() {
    setSending(true)

    try {
      // 1. Location permission + fix
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location needed', 'RESQ needs your location to send help to the right place.')
        setSending(false)
        return
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
      const { latitude, longitude } = position.coords

      // 2. Get my institution
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('institution_id')
        .eq('id', userData.user.id)
        .single()

      if (profileError || !profile.institution_id) {
        Alert.alert('Not linked to an institution', 'Please enter your institution code first.')
        setSending(false)
        return
      }

      // 3. Create the emergency
      const { data: emergency, error: insertError } = await supabase
        .from('emergencies')
        .insert({
          institution_id: profile.institution_id,
          triggered_by: userData.user.id,
          lat: latitude,
          lng: longitude,
          triggered_via: 'app',
          emergency_type: selectedType
        })
        .select()
        .single()

      if (insertError) {
        Alert.alert('Could not send emergency', insertError.message)
        setSending(false)
        return
      }

      // 4. Fire-and-forget: AI advice, notify responders, and photo upload (don't block navigation)
      const { data: sessionData } = await supabase.auth.getSession()
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData.session?.access_token || ''}` }
      fetch(`${API_BASE_URL}/api/emergency/generate-advice`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ emergencyId: emergency.id })
      })
        .catch(() => {})

      fetch(`${API_BASE_URL}/api/emergency/notify-responders`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ emergencyId: emergency.id })
      })
        .catch(() => {})

      if (photo) uploadPhoto(emergency.id)

      setSending(false)
      navigation.replace('UserEmergencyActive', { emergencyId: emergency.id })
    } catch (err) {
      setSending(false)
      Alert.alert('Something went wrong', err.message)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/icon.png')} style={styles.logo} />
      <Text style={styles.subtitle}>What's happening?</Text>
      <TouchableOpacity onPress={() => navigation.navigate('ManageGuardians')} disabled={sending}>
        <Text style={styles.guardiansLinkText}>👥 Trusted Contacts</Text>
      </TouchableOpacity>

      <View style={styles.typeRow}>
        {visibleTypes.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeChip, selectedType === t.key && styles.typeChipSelected]}
            onPress={() => setSelectedType(t.key)}
            disabled={sending}
          >
            <View style={[styles.typeEmojiBadge, { backgroundColor: `${t.color}26` }, selectedType === t.key && { shadowColor: t.color, shadowOpacity: 1, shadowRadius: 4, elevation: 3 }]}>
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
            </View>
            <Text style={[styles.typeLabel, selectedType === t.key && styles.typeLabelSelected]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {photo ? (
        <View style={styles.photoPreviewRow}>
          <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
          <TouchableOpacity onPress={() => setPhoto(null)} disabled={sending}>
            <Text style={styles.removePhoto}>Remove photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={handleAttachPhoto} disabled={sending} style={styles.attachButton}>
          <Text style={styles.attachButtonText}>📷 Attach a photo (optional)</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.bigButton}
        onPress={handleTriggerEmergency}
        disabled={sending}
        activeOpacity={0.8}
      >
        {sending ? (
          <ActivityIndicator color="white" size="large" />
        ) : (
          <Text style={styles.bigButtonText}>SEND{'\n'}EMERGENCY</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footnote}>
        Your exact location will be shared with your institution's emergency responders.
      </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#05070d' },
  container: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  guardiansLinkText: { color: '#35d0e8', fontWeight: '600', fontSize: 13, marginBottom: 16, padding: 8 },
  logo: { width: 64, height: 64, borderRadius: 14, marginBottom: 8 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#f4f6fb', marginBottom: 8, letterSpacing: 1 },
  subtitle: { textAlign: 'center', color: '#9aa4bf', marginBottom: 16, fontSize: 15, fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16, gap: 10 },
  typeChip: {
    width: 82,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)'
  },
  typeChipSelected: { borderColor: '#ff2b2b', backgroundColor: 'rgba(255,43,43,0.16)' },
  typeEmojiBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 11, color: '#9aa4bf', fontWeight: '600', textAlign: 'center' },
  typeLabelSelected: { color: '#ff8080' },
  attachButton: { marginBottom: 20, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' },
  attachButtonText: { color: '#9aa4bf', fontSize: 13, fontWeight: '600' },
  photoPreviewRow: { alignItems: 'center', marginBottom: 20 },
  photoThumb: { width: 90, height: 90, borderRadius: 10, marginBottom: 6 },
  removePhoto: { color: '#ff8080', fontSize: 12, fontWeight: '600' },
  bigButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#cc0000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  bigButtonText: { color: 'white', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  footnote: { marginTop: 40, textAlign: 'center', color: '#5c6480', fontSize: 12, paddingHorizontal: 20 }
})