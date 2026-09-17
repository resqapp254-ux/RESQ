// components/RadarPulseBackground.js
// A subtle ambient radar pulse behind auth-style screens — two rings
// expanding and fading on a loop. Cheap (two Animated.Views, native
// driver), so it never competes with actual input responsiveness.

import React, { useEffect, useRef } from 'react'
import { View, StyleSheet, Animated, Easing } from 'react-native'

function Ring({ delay }) {
  const anim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 3200, delay, easing: Easing.out(Easing.quad), useNativeDriver: true })
    )
    loop.start()
    return () => loop.stop()
  }, [anim, delay])

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.2] })
  const opacity = anim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.5, 0] })

  return <Animated.View style={[styles.ring, { opacity, transform: [{ scale }] }]} />
}

export default function RadarPulseBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <Ring delay={0} />
      <Ring delay={1600} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  ring: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1.5,
    borderColor: 'rgba(53,208,232,0.5)'
  }
})
