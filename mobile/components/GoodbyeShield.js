// components/GoodbyeShield.js
// A pure shield, nothing else — no arms, no legs, no humanoid body at
// all, specifically so it can never read as a devil/horned figure the
// way the limbed Guardian mascot could in its "wave" pose. Just a
// smiling shield that gently rocks side to side, like a nod goodbye.
// Used only by SignOutOverlay — Guardian.js stays as-is for the
// Welcome screen's push/carry sequence, which needs arms.

import React, { useEffect, useRef } from 'react'
import { View, Animated, StyleSheet, Easing } from 'react-native'

export default function GoodbyeShield({ rocking = false }) {
  const rock = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!rocking) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rock, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rock, { toValue: -1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [rocking])

  const rotate = rock.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] })

  return (
    <Animated.View style={[styles.shield, rocking && { transform: [{ rotate }] }]}>
      <View style={styles.eyeRow}>
        <View style={styles.eye} />
        <View style={styles.eye} />
      </View>
      <View style={styles.smile} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  shield: {
    width: 60,
    height: 76,
    backgroundColor: '#cc0000',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    alignItems: 'center',
    paddingTop: 20
  },
  eyeRow: { flexDirection: 'row', gap: 10 },
  eye: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  smile: {
    width: 20,
    height: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 2.5,
    borderColor: '#fff',
    marginTop: 8
  }
})
