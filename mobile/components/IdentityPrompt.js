// components/IdentityPrompt.js
// Shown once, the first time a user or responder lands on their home
// screen, if their institution requires an admission/work-ID number
// and/or (for responders) a one-time profile picture they haven't
// provided yet. Mirrors admin-dashboard/components/IdentityPrompt.js.

import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert, ActivityIndicator, Image } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../lib/supabase'

export default function IdentityPrompt({ userId, role, needsAdmissionNumber, needsPhoto, onDone }) {
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in settings to add a profile picture.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 })
    if (!result.canceled) setPhoto(result.assets[0])
  }

  async function handleSubmit() {
    if (needsAdmissionNumber && !admissionNumber.trim()) {
      Alert.alert('Missing information', 'Enter your admission/work ID number to continue.')
      return
    }
    if (needsPhoto && !photo) {
      Alert.alert('Missing information', 'Add a profile picture to continue.')
      return
    }

    setSaving(true)
    try {
      const updates = {}
      if (needsAdmissionNumber) updates.admission_number = admissionNumber.trim()

      if (needsPhoto && photo) {
        const ext = photo.uri.split('.').pop() || 'jpg'
        const path = `${userId}-${Date.now()}.${ext}`
        const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 })
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, decode(base64), { upsert: true, contentType: `image/${ext}` })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
        updates.avatar_url = publicUrlData.publicUrl
      }

      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', userId)
      if (updateError) throw updateError

      onDone()
    } catch (err) {
      Alert.alert('Could not save', err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>One more thing</Text>
          <Text style={styles.subtitle}>Your institution asks for the following before you continue. This is only requested once.</Text>

          {needsAdmissionNumber && (
            <>
              <Text style={styles.label}>Admission / work ID / reference number</Text>
              <TextInput style={styles.input} value={admissionNumber} onChangeText={setAdmissionNumber} placeholderTextColor="#5c6480" />
            </>
          )}

          {needsPhoto && (
            <>
              <Text style={styles.label}>{role === 'responder' ? 'Responder profile picture' : 'Profile picture'}</Text>
              <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
                {photo ? (
                  <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                ) : (
                  <Text style={styles.photoButtonText}>📷 Choose a photo</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Continue</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,7,13,0.9)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#0b1024', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f4f6fb', marginBottom: 6 },
  subtitle: { color: '#9aa4bf', fontSize: 13, marginBottom: 16 },
  label: { color: '#9aa4bf', fontSize: 13, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#f4f6fb', borderRadius: 10, padding: 12, marginBottom: 16 },
  photoButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 16 },
  photoButtonText: { color: '#9aa4bf' },
  photoPreview: { width: 64, height: 64, borderRadius: 32 },
  submitButton: { backgroundColor: '#cc0000', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '700' }
})
