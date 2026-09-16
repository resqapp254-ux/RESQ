// screens/WelcomeScreen.js
// The very first thing anyone sees, once, on first install — the RESQ
// shield orbiting a globe (matching the web app's login animation),
// then a warm hello before the language/consent step. Purely a first
// impression; taps straight through to LanguageConsent (which itself
// only shows once) or Bootstrap on every later launch, so this never
// blocks a returning user.

import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WELCOME_SEEN_KEY = 'resq-welcome-seen'

// Precomputed points around an ellipse (matches the flattened orbit
// path on the web login screen) — piecewise-linear interpolation
// across enough steps reads as a smooth circular motion.
const ORBIT_STEPS = 36
const ORBIT_RADIUS_X = 110
const ORBIT_RADIUS_Y = 60
const orbitInput = []
const orbitX = []
const orbitY = []
for (let i = 0; i <= ORBIT_STEPS; i++) {
  const angle = (i / ORBIT_STEPS) * Math.PI * 2
  orbitInput.push(i / ORBIT_STEPS)
  orbitX.push(Math.cos(angle) * ORBIT_RADIUS_X)
  orbitY.push(Math.sin(angle) * ORBIT_RADIUS_Y)
}

export default function WelcomeScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.4)).current
  const orbit = useRef(new Animated.Value(0)).current

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
      Animated.loop(
        Animated.timing(orbit, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true })
      ).start()
    })
  }, [fade, scale, orbit])

  const translateX = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitX })
  const translateY = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitY })

  async function handleContinue() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true')
    navigation.replace('LanguageConsent')
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.globeWrap, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.globeGlow} />
        <View style={styles.globe}>
          <View style={[styles.meridian, { transform: [{ rotate: '0deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '60deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '120deg' }] }]} />
          <View style={styles.equator} />
        </View>
        <Animated.View style={[styles.orbitingShield, { transform: [{ translateX }, { translateY }] }]}>
          <Image source={require('../assets/welcome-shield.png')} style={styles.shield} />
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
  globeWrap: { width: 260, height: 220, alignItems: 'center', justifyContent: 'center' },
  globeGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(204,0,0,0.08)'
  },
  globe: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(53,208,232,0.35)',
    backgroundColor: 'rgba(24,33,66,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  meridian: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: 'rgba(53,208,232,0.18)'
  },
  equator: {
    position: 'absolute',
    width: 160,
    height: 1,
    backgroundColor: 'rgba(53,208,232,0.25)'
  },
  orbitingShield: { position: 'absolute' },
  shield: { width: 44, height: 44 },
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
