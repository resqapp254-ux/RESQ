// components/Guardian.js
// The RESQ guardian — shield-headed, caped figure — shared between the
// Welcome screen's push-carry sequence and the sign-out wave overlay.
// Simple View shapes, matching the flat-vector style used everywhere
// else in the app.

import React from 'react'
import { View, StyleSheet } from 'react-native'

const ARM_ANGLES = {
  push: { left: '25deg', right: '-65deg' },
  carry: { left: '150deg', right: '-150deg' },
  fly: { left: '35deg', right: '-35deg' },
  wave: { left: '35deg', right: '-150deg' }
}

export default function Guardian({ pose = 'fly' }) {
  const arms = ARM_ANGLES[pose] || ARM_ANGLES.fly

  return (
    <View style={styles.wrap}>
      <View style={[styles.cape, styles.capeLeft]} />
      <View style={[styles.cape, styles.capeRight]} />
      <View style={[styles.arm, { transform: [{ rotate: arms.left }] }]} />
      <View style={[styles.arm, { transform: [{ rotate: arms.right }] }]} />
      <View style={styles.body}>
        <View style={styles.emblem} />
      </View>
      <View style={styles.head}>
        <View style={styles.eyeRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: 60, height: 76, alignItems: 'center' },
  cape: { position: 'absolute', top: 6, width: 22, height: 44, backgroundColor: '#8a0000', borderRadius: 10 },
  capeLeft: { left: 2, transform: [{ rotate: '-12deg' }] },
  capeRight: { right: 2, transform: [{ rotate: '12deg' }] },
  body: {
    width: 26,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1e2a56',
    borderWidth: 1,
    borderColor: 'rgba(53,208,232,0.4)',
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emblem: { width: 9, height: 11, borderRadius: 3, backgroundColor: '#cc0000' },
  arm: {
    position: 'absolute',
    top: 28,
    left: 26,
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e2a56'
  },
  head: {
    position: 'absolute',
    top: 0,
    width: 26,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#cc0000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  eyeRow: { flexDirection: 'row', gap: 5, marginTop: 2 },
  eye: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' }
})
