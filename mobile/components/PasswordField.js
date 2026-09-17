// components/PasswordField.js
// A password TextInput with a built-in show/hide toggle — every
// password field in the app should use this instead of a bare
// secureTextEntry TextInput, so users can verify what they typed.

import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'

export default function PasswordField({ style, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <View style={styles.wrap}>
      <TextInput {...props} style={[style, styles.input]} secureTextEntry={!visible} />
      <TouchableOpacity
        style={styles.toggle}
        onPress={() => setVisible((v) => !v)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.toggleText}>{visible ? '🙈' : '👁️'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', justifyContent: 'center', marginBottom: 12 },
  input: { paddingRight: 44, marginBottom: 0 },
  toggle: { position: 'absolute', right: 12, padding: 4 },
  toggleText: { fontSize: 17 }
})
