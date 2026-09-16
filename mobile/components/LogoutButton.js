// components/LogoutButton.js
// Every screen past the login gate gets this in its header — no
// screen should ever be a dead end with no way out.

import React from 'react'
import { TouchableOpacity, Text, Alert } from 'react-native'
import { supabase } from '../lib/supabase'

export default function LogoutButton({ navigation }) {
  function confirmLogout() {
    Alert.alert('Log out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          navigation.reset({ index: 0, routes: [{ name: 'Auth' }] })
        }
      }
    ])
  }

  return (
    <TouchableOpacity onPress={confirmLogout} style={{ paddingHorizontal: 12, paddingVertical: 6 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Text style={{ color: '#ff8080', fontWeight: '600', fontSize: 14 }}>Log out</Text>
    </TouchableOpacity>
  )
}
