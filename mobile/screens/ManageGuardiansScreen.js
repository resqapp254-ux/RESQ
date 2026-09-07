import React, { useEffect, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../lib/supabase'

export default function ManageGuardiansScreen() {
  const [userId, setUserId] = useState(null)
  const [guardians, setGuardians] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSession()
  }, [])

  async function loadSession() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      Alert.alert('Sign in required', 'Please sign in again to manage trusted contacts.')
      return
    }
    setUserId(user.id)
    await loadGuardians(user.id)
  }

  async function loadGuardians(id = userId) {
    const { data, error } = await supabase.from('guardians').select('id, guardian_name, guardian_phone, created_at').eq('user_id', id).order('created_at', { ascending: true })
    setLoading(false)
    if (error) Alert.alert('Could not load contacts', error.message)
    else setGuardians(data || [])
  }

  async function handleAdd() {
    const trimmedName = name.trim()
    const trimmedPhone = phone.trim()
    if (!trimmedName || !trimmedPhone) {
      Alert.alert('Missing info', 'Enter both a name and phone number.')
      return
    }
    if (guardians.length >= 3) {
      Alert.alert('Limit reached', 'You can add up to 3 trusted contacts.')
      return
    }

    setSaving(true)
    const { error } = await supabase.from('guardians').insert({ user_id: userId, guardian_name: trimmedName, guardian_phone: trimmedPhone })
    setSaving(false)
    if (error) {
      Alert.alert(error.code === '23505' ? 'Contact already added' : 'Could not add contact', error.code === '23505' ? 'That phone number is already in your trusted contacts.' : error.message)
      return
    }
    setName('')
    setPhone('')
    await loadGuardians()
  }

  function handleRemove(id) {
    Alert.alert('Remove trusted contact?', 'They will no longer receive emergency SMS alerts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('guardians').delete().eq('id', id)
        if (error) Alert.alert('Could not remove contact', error.message)
        else await loadGuardians()
      } }
    ])
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trusted Contacts</Text>
      <Text style={styles.subtitle}>These people receive a text when you trigger an emergency, separately from your institution's responders.</Text>
      {loading ? <Text style={styles.empty}>Loading contacts...</Text> : <FlatList data={guardians} keyExtractor={(item) => item.id} style={styles.list} ListEmptyComponent={<Text style={styles.empty}>No trusted contacts added yet.</Text>} renderItem={({ item }) => (
        <View style={styles.row}><View><Text style={styles.name}>{item.guardian_name}</Text><Text style={styles.phone}>{item.guardian_phone}</Text></View><TouchableOpacity onPress={() => handleRemove(item.id)}><Text style={styles.remove}>Remove</Text></TouchableOpacity></View>
      )} />}
      {guardians.length < 3 && <View style={styles.addBox}><TextInput style={styles.input} placeholder="Contact name" value={name} onChangeText={setName} /><TextInput style={styles.input} placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><TouchableOpacity style={styles.button} onPress={handleAdd} disabled={saving}><Text style={styles.buttonText}>{saving ? 'Adding...' : 'Add Trusted Contact'}</Text></TouchableOpacity></View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#cc0000', marginBottom: 6 },
  subtitle: { color: '#666', fontSize: 13, marginBottom: 20, lineHeight: 18 },
  list: { flex: 1 },
  empty: { color: '#999', textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f7f7', padding: 14, borderRadius: 10, marginBottom: 10 },
  name: { fontWeight: 'bold', fontSize: 15 },
  phone: { color: '#666', fontSize: 13, marginTop: 2 },
  remove: { color: '#cc0000', fontWeight: '600', fontSize: 13 },
  addBox: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 16, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#cc0000', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
})