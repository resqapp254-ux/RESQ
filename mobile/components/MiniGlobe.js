// components/MiniGlobe.js
// A compact version of the Welcome screen's ringed planet — same real
// 3D transform technique (perspective + rotateX/Y/Z), just smaller and
// without the orbiting shield, for decorating headers like the sign-in
// screen without slowing anything down (pure Animated.View, no JS-
// thread work once started).

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'

export default function MiniGlobe({ size = 110 }) {
  const ringSpin = useRef(new Animated.Value(0)).current
  const planetSpin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(Animated.timing(ringSpin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })).start()
    Animated.loop(Animated.timing(planetSpin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true })).start()
  }, [ringSpin, planetSpin])

  const ringSpinDeg = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const planetSpinDeg = planetSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  const scale = size / 170

  return (
    <View style={[styles.wrap, { width: size * 1.7, height: size * 1.5 }]}>
      <Animated.View
        style={[
          styles.ring,
          { width: 160 * scale, height: 160 * scale, borderRadius: 80 * scale, borderWidth: 5 * scale },
          { transform: [{ perspective: 700 }, { rotateX: '72deg' }, { rotateZ: ringSpinDeg }] }
        ]}
      />
      <Animated.View
        style={[
          styles.globe,
          { width: 92 * scale, height: 92 * scale, borderRadius: 46 * scale },
          { transform: [{ perspective: 700 }, { rotateY: planetSpinDeg }] }
        ]}
      >
        <View style={[styles.meridian, { width: 92 * scale, height: 92 * scale, borderRadius: 46 * scale, transform: [{ rotate: '60deg' }] }]} />
        <View style={[styles.meridian, { width: 92 * scale, height: 92 * scale, borderRadius: 46 * scale, transform: [{ rotate: '120deg' }] }]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderColor: 'rgba(53,208,232,0.55)' },
  globe: {
    borderWidth: 1.2,
    borderColor: 'rgba(53,208,232,0.45)',
    backgroundColor: 'rgba(12,18,38,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  meridian: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(53,208,232,0.18)' }
})
