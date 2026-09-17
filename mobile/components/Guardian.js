// components/Guardian.js
// The RESQ guardian — the shield itself is the whole body, smiling,
// with simple arms and legs attached directly to it. Earlier versions
// gave it a separate humanoid head+torso+cape, which read as a red,
// horned, devil-like figure — there's no head/cape left to cause that
// now, just the shield with a face on it. Shared between the Welcome
// screen's push-carry sequence and the sign-out wave overlay.

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
      <View style={[styles.leg, styles.legLeft]} />
      <View style={[styles.leg, styles.legRight]} />
      <View style={[styles.arm, styles.armLeft, { transform: [{ rotate: arms.left }] }]} />
      <View style={[styles.arm, styles.armRight, { transform: [{ rotate: arms.right }] }]} />
      <View style={styles.shield}>
        <View style={styles.eyeRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <View style={styles.smile} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { width: 60, height: 84, alignItems: 'center' },
  shield: {
    position: 'absolute',
    top: 0,
    left: 8,
    width: 44,
    height: 56,
    backgroundColor: '#cc0000',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    alignItems: 'center',
    paddingTop: 15
  },
  eyeRow: { flexDirection: 'row', gap: 8 },
  eye: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#fff' },
  smile: {
    width: 16,
    height: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 2,
    borderColor: '#fff',
    marginTop: 6
  },
  arm: { position: 'absolute', top: 22, width: 20, height: 7, borderRadius: 4, backgroundColor: '#cc0000' },
  armLeft: { left: 2 },
  armRight: { right: 2 },
  leg: { position: 'absolute', bottom: 0, width: 7, height: 20, borderRadius: 4, backgroundColor: '#0d142d' },
  legLeft: { left: 18 },
  legRight: { right: 18 }
})
