// screens/WelcomeScreen.js
// The very first thing anyone sees, once, on first install — the RESQ
// shield orbiting a ringed planet. Three independent 3D rotations run
// at once (perspective + rotateX/Y/Z, React Native's real 3D transform
// pipeline, not a flat approximation): the ring spins and its tilt
// slowly breathes, the sphere spins on its own axis, and the shield
// orbits the whole system with a depth-scale/opacity illusion as it
// passes in front of and behind the planet. Then a warm hello before
// the language/consent step — taps straight through to LanguageConsent
// (which itself only shows once) or Bootstrap on every later launch,
// so this never blocks a returning user.

import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WELCOME_SEEN_KEY = 'resq-welcome-seen'

// Precomputed orbit points (position + depth-based scale/opacity) —
// piecewise-linear interpolation across enough steps reads as smooth
// circular motion, and the depth factor fakes the shield passing in
// front of / behind the planet as it orbits.
const ORBIT_STEPS = 72
const ORBIT_RADIUS_X = 150
const ORBIT_RADIUS_Y = 72
const orbitInput = []
const orbitX = []
const orbitY = []
const orbitScale = []
const orbitOpacity = []
for (let i = 0; i <= ORBIT_STEPS; i++) {
  const progress = i / ORBIT_STEPS
  const angle = progress * Math.PI * 2
  orbitInput.push(progress)
  orbitX.push(Math.cos(angle) * ORBIT_RADIUS_X)
  orbitY.push(Math.sin(angle) * ORBIT_RADIUS_Y)
  const depthFactor = (Math.sin(angle) + 1) / 2 // 0 at back, 1 at front
  orbitScale.push(0.72 + depthFactor * 0.5) // 0.72x .. 1.22x
  orbitOpacity.push(0.4 + depthFactor * 0.6) // 0.4 .. 1.0
}

export default function WelcomeScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.4)).current
  const orbit = useRef(new Animated.Value(0)).current
  const ringSpin = useRef(new Animated.Value(0)).current
  const ringTilt = useRef(new Animated.Value(0)).current
  const planetSpin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((seen) => {
      if (seen) {
        navigation.replace('Bootstrap')
      }
    })
  }, [navigation])

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true })
    ]).start(() => {
      Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })).start()
      Animated.loop(Animated.timing(ringSpin, { toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true })).start()
      Animated.loop(Animated.timing(ringTilt, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })).start()
      Animated.loop(Animated.timing(planetSpin, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })).start()
    })
  }, [fade, scale, orbit, ringSpin, ringTilt, planetSpin])

  const translateX = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitX })
  const translateY = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitY })
  const shieldScale = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitScale })
  const depthOpacity = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitOpacity })
  const ringSpinDeg = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ringTiltDeg = ringTilt.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['68deg', '80deg', '68deg'] })
  const planetSpinDeg = planetSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  async function handleContinue() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true')
    navigation.replace('LanguageConsent')
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.globeWrap, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.globeGlow} />

        {/* Saturn-style rings — plain circles, flattened into ellipses by
            real 3D perspective (not a CSS-style flat fake), continuously
            spinning with a slow tilt breathe. Drawn before the sphere so
            it paints on top of their middle, like rings behind a planet. */}
        <Animated.View style={[styles.ringOuter, { transform: [{ perspective: 700 }, { rotateX: ringTiltDeg }, { rotateZ: ringSpinDeg }] }]} />
        <Animated.View style={[styles.ringInner, { transform: [{ perspective: 700 }, { rotateX: ringTiltDeg }, { rotateZ: ringSpinDeg }] }]} />

        {/* Planet sphere, spinning on its own axis in true 3D */}
        <Animated.View style={[styles.globe, { transform: [{ perspective: 700 }, { rotateY: planetSpinDeg }] }]}>
          <View style={[styles.meridian, { transform: [{ rotate: '0deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '60deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '120deg' }] }]} />
          <View style={styles.equator} />
        </Animated.View>

        <Animated.View
          style={[
            styles.orbitingShield,
            { opacity: Animated.multiply(fade, depthOpacity), transform: [{ translateX }, { translateY }, { scale: shieldScale }] }
          ]}
        >
          <Image source={require('../assets/welcome-shield.png')} style={styles.shield} resizeMode="contain" />
        </Animated.View>
      </Animated.View>

      <Animated.View style={{ opacity: fade }}>
        <Text style={styles.title}>Welcome to RESQ 👋</Text>
        <Text style={styles.subtitle}>We're here to get you help, fast, whenever you need it.</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fade, width: '100%' }}>
        <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#05070d', padding: 32, gap: 28 },
  globeWrap: { width: 320, height: 260, alignItems: 'center', justifyContent: 'center' },
  globeGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,43,43,0.08)'
  },
  ringOuter: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 7,
    borderColor: 'rgba(53,208,232,0.55)'
  },
  ringInner: {
    position: 'absolute',
    width: 228,
    height: 228,
    borderRadius: 114,
    borderWidth: 1.5,
    borderColor: 'rgba(205,245,251,0.4)'
  },
  globe: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1.5,
    borderColor: 'rgba(53,208,232,0.45)',
    backgroundColor: 'rgba(12,18,38,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  meridian: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: 'rgba(53,208,232,0.18)'
  },
  equator: {
    position: 'absolute',
    width: 150,
    height: 1.2,
    backgroundColor: 'rgba(53,208,232,0.35)'
  },
  orbitingShield: { position: 'absolute', zIndex: 10 },
  shield: { width: 46, height: 46 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#f4f6fb', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9aa4bf', textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  button: {
    backgroundColor: '#cc0000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#cc0000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 5
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }
})
