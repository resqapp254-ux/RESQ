// screens/WelcomeScreen.js
// The very first thing anyone sees, once, on first install — the RESQ
// shield orbiting a globe with a pseudo-3D depth effect (matches the
// web app's login animation), then a warm hello before the
// language/consent step. Purely a first impression; taps straight
// through to LanguageConsent (which itself only shows once) or
// Bootstrap on every later launch, so this never blocks a returning
// user.

import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WELCOME_SEEN_KEY = 'resq-welcome-seen'

// Precomputed points around an ellipse (matches the flattened orbit
// path on the web login screen) — piecewise-linear interpolation
// across enough steps reads as a smooth circular motion. Scale/opacity
// are derived from the same angle to fake depth: the shield is bigger
// and fully opaque passing in "front" of the globe, smaller and dimmer
// passing "behind" it.
const ORBIT_STEPS = 72
const ORBIT_RADIUS_X = 115
const ORBIT_RADIUS_Y = 55
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
  orbitScale.push(0.75 + depthFactor * 0.45) // 0.75x .. 1.2x
  orbitOpacity.push(0.45 + depthFactor * 0.55) // 0.45 .. 1.0
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
        Animated.timing(orbit, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
      ).start()
    })
  }, [fade, scale, orbit])

  const translateX = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitX })
  const translateY = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitY })
  const shieldScale = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitScale })
  const depthOpacity = orbit.interpolate({ inputRange: orbitInput, outputRange: orbitOpacity })

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
          <View style={[styles.meridian, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '90deg' }] }]} />
          <View style={[styles.meridian, { transform: [{ rotate: '135deg' }] }]} />
          <View style={styles.equator} />
        </View>
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
  globeWrap: { width: 280, height: 240, alignItems: 'center', justifyContent: 'center' },
  globeGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,43,43,0.08)'
  },
  globe: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(53,208,232,0.45)',
    backgroundColor: 'rgba(12,18,38,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  meridian: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1,
    borderColor: 'rgba(53,208,232,0.18)'
  },
  equator: {
    position: 'absolute',
    width: 170,
    height: 1.2,
    backgroundColor: 'rgba(53,208,232,0.35)'
  },
  orbitingShield: { position: 'absolute', zIndex: 10 },
  shield: { width: 48, height: 48 },
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
