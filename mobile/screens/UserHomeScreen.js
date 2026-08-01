// screens/UserHomeScreen.js
// The core of the user side: pick what's wrong, optionally attach
// a photo, then press the big button to send an emergency with the
// user's live location, routing them to the active-emergency screen.

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image } from 'react-native'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

const EMERGENCY_TYPES = [
  { key: 'medical', label: 'Medical', emoji: '🏥' },
  { key: 'fire', label: 'Fire', emoji: '🔥' },
  { key: 'accident', label: 'Accident', emoji: '🚑' },
  { key: 'security', label: 'Security', emoji: '🛡️' },
  { key: 'gbv', label: 'GBV', emoji: '🤝' },
  { key: 'mental_health', label: 'Mental Health', emoji: '🧠' },
  { key: 'other', label: 'Other', emoji: '⚠️' }
]

export default function UserHomeScreen({ navigation }) {
  const [sending, setSending] = useState(false)
  const [selectedType, setSelectedType] = useState('other')
  const [photo, setPhoto] = useState(null) // { uri }

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
    console.log('PHOTO UPLOAD: starting, uri =', photo.uri)
    try {
      const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 })
      console.log('PHOTO UPLOAD: read base64, length =', base64.length)
      const arrayBuffer = decode(base64)
      const path = `${emergencyId}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('emergency-photos')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) {
        console.log('PHOTO UPLOAD FAILED at storage.upload:', JSON.stringify(uploadError))
        return
      }
      console.log('PHOTO UPLOAD: storage upload succeeded, path =', path)

      const { data: urlData } = supabase.storage.from('emergency-photos').getPublicUrl(path)
      console.log('PHOTO UPLOAD: public URL =', urlData.publicUrl)

      const { data: updateData, error: updateError } = await supabase
        .from('emergencies')
        .update({ photo_url: urlData.publicUrl })
        .eq('id', emergencyId)
        .select()

      console.log('PHOTO UPLOAD: update result:', JSON.stringify({ updateData, updateError }))

      if (updateError) {
        console.log('PHOTO UPLOAD FAILED at emergencies update:', JSON.stringify(updateError))
      } else if (!updateData || updateData.length === 0) {
        console.log('PHOTO UPLOAD: update affected 0 rows — likely blocked by RLS')
      } else {
        console.log('PHOTO UPLOAD: emergency row updated successfully')
      }
    } catch (err) {
      console.log('PHOTO UPLOAD FAILED (exception):', err.message)
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
      fetch(`${API_BASE_URL}/api/emergency/generate-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: emergency.id })
      })
        .then((res) => res.json())
        .then((data) => console.log('AI advice response:', JSON.stringify(data)))
        .catch((err) => console.log('AI advice fetch FAILED:', err.message))

      fetch(`${API_BASE_URL}/api/emergency/notify-responders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: emergency.id })
      })
        .then((res) => res.json())
        .then((data) => console.log('Notify responders response:', JSON.stringify(data)))
        .catch((err) => console.log('Notify responders fetch FAILED:', err.message))

      if (photo) uploadPhoto(emergency.id)

      setSending(false)
      navigation.replace('UserEmergencyActive', { emergencyId: emergency.id })
    } catch (err) {
      setSending(false)
      Alert.alert('Something went wrong', err.message)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESQ</Text>
      <Text style={styles.subtitle}>What's happening?</Text>

      <View style={styles.typeRow}>
        {EMERGENCY_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.typeChip, selectedType === t.key && styles.typeChipSelected]}
            onPress={() => setSelectedType(t.key)}
            disabled={sending}
          >
            <Text style={styles.typeEmoji}>{t.emoji}</Text>
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#cc0000', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 16, fontSize: 15, fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 16, gap: 10 },
  typeChip: {
    width: 82,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  typeChipSelected: { borderColor: '#cc0000', backgroundColor: '#fdeaea' },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 11, color: '#666', fontWeight: '600', textAlign: 'center' },
  typeLabelSelected: { color: '#cc0000' },
  attachButton: { marginBottom: 20, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f0f0f0' },
  attachButtonText: { color: '#555', fontSize: 13, fontWeight: '600' },
  photoPreviewRow: { alignItems: 'center', marginBottom: 20 },
  photoThumb: { width: 90, height: 90, borderRadius: 10, marginBottom: 6 },
  removePhoto: { color: '#cc0000', fontSize: 12, fontWeight: '600' },
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
  footnote: { marginTop: 40, textAlign: 'center', color: '#999', fontSize: 12, paddingHorizontal: 20 }
})