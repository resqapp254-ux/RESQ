// screens/WelcomeScreen.js
// The very first thing anyone sees, once, on first install. The RESQ
// guardian flies in, pushes the planet into a spin (its surface lights
// up with red alert dots), then scoops it up to carry it — and as it
// does, every dot turns green. The ring+planet themselves use React
// Native's real 3D transform pipeline (perspective + rotateX/Y/Z), not
// a flat approximation. Then a warm hello before the language/consent
// step — taps straight through to LanguageConsent (which itself only
// shows once) or Bootstrap on every later launch, so this never blocks
// a returning user.

import React, { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Guardian from '../components/Guardian'

const WELCOME_SEEN_KEY = 'resq-welcome-seen'

const RING_TILT_OUTPUT = ['68deg', '80deg', '68deg']

// Eight alert dots spaced around the planet's ring — position is fixed,
// only their red/green opacity animates.
const DOT_COUNT = 8
const DOT_RADIUS_X = 118
const DOT_RADIUS_Y = 46
const dots = Array.from({ length: DOT_COUNT }).map((_, i) => {
  const angle = (i / DOT_COUNT) * Math.PI * 2
  return { x: Math.cos(angle) * DOT_RADIUS_X, y: Math.sin(angle) * DOT_RADIUS_Y }
})

// The guardian, built from simple View shapes at the scale this screen
// needs — a stylized figure, not a rendered character model, matching
// the same flat-vector language used everywhere else in the app.
export default function WelcomeScreen({ navigation }) {
  const fade = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.4)).current
  const ringSpin = useRef(new Animated.Value(0)).current
  const ringTilt = useRef(new Animated.Value(0)).current
  const planetSpin = useRef(new Animated.Value(0)).current
  const sequenceT = useRef(new Animated.Value(0)).current
  const textFade = useRef(new Animated.Value(0)).current

  const [pose, setPose] = useState('push')
  const [dotsOn, setDotsOn] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_SEEN_KEY).then((seen) => {
      if (seen) {
        navigation.replace('Bootstrap')
      }
    })
  }, [navigation])

  useEffect(() => {
    let poseTimer

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true })
    ]).start(() => {
      Animated.loop(Animated.timing(ringSpin, { toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true })).start()
      Animated.loop(Animated.timing(ringTilt, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })).start()
      Animated.loop(Animated.timing(planetSpin, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })).start()

      // The push-spin-carry story, driven by one timeline so every
      // piece (hero position, pose, dot colors) stays in sync.
      setDotsOn(true)
      Animated.sequence([
        Animated.timing(sequenceT, { toValue: 0.3, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }), // approach + push
        Animated.timing(sequenceT, { toValue: 0.3, duration: 1400, useNativeDriver: true }), // hold — spinning with red dots
        Animated.timing(sequenceT, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }) // move to carry, dots turn green
      ]).start(() => {
        Animated.timing(textFade, { toValue: 1, duration: 500, useNativeDriver: true }).start()
      })

      poseTimer = setTimeout(() => setPose('carry'), 2700)
    })

    // Scoped to the outer effect (not the .start() callback, whose
    // return value Animated ignores) so a fast unmount — a returning
    // user redirected to Bootstrap before this even finishes — can't
    // fire setPose after the screen is gone.
    return () => {
      if (poseTimer) clearTimeout(poseTimer)
    }
  }, [fade, scale, ringSpin, ringTilt, planetSpin, sequenceT, textFade])

  const ringSpinDeg = ringSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
  const ringTiltDeg = ringTilt.interpolate({ inputRange: [0, 0.5, 1], outputRange: RING_TILT_OUTPUT })
  const planetSpinDeg = planetSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })

  // Hero: approaches from the left, pushes, then arcs down to carry
  // the planet from underneath.
  const heroX = sequenceT.interpolate({ inputRange: [0, 0.3, 1], outputRange: [-210, -78, 0] })
  const heroY = sequenceT.interpolate({ inputRange: [0, 0.3, 0.6, 1], outputRange: [10, 0, 40, 92] })
  const heroScale = sequenceT.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.55, 0.95, 0.85] })

  // The planet gets nudged by the push, then lifts slightly once carried.
  const planetShiftX = sequenceT.interpolate({ inputRange: [0, 0.3, 0.35, 1], outputRange: [0, 0, 6, 6] })
  const planetShiftY = sequenceT.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, -14] })

  const redOpacity = sequenceT.interpolate({ inputRange: [0, 0.3, 0.32, 0.75, 1], outputRange: [0, 0, 1, 1, 0] })
  const greenOpacity = sequenceT.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0, 0, 1] })

  async function handleContinue() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true')
    navigation.replace('LanguageConsent')
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.globeWrap, { opacity: fade, transform: [{ scale }] }]}>
        <View style={styles.globeGlow} />

        <Animated.View style={{ transform: [{ translateX: planetShiftX }, { translateY: planetShiftY }] }}>
          {/* Saturn-style rings — plain circles, flattened into ellipses
              by real 3D perspective, continuously spinning with a slow
              tilt breathe. */}
          <Animated.View style={[styles.ringOuter, { transform: [{ perspective: 700 }, { rotateX: ringTiltDeg }, { rotateZ: ringSpinDeg }] }]} />
          <Animated.View style={[styles.ringInner, { transform: [{ perspective: 700 }, { rotateX: ringTiltDeg }, { rotateZ: ringSpinDeg }] }]} />

          {/* Planet sphere, spinning on its own axis in true 3D */}
          <Animated.View style={[styles.globe, { transform: [{ perspective: 700 }, { rotateY: planetSpinDeg }] }]}>
            <View style={[styles.meridian, { transform: [{ rotate: '0deg' }] }]} />
            <View style={[styles.meridian, { transform: [{ rotate: '60deg' }] }]} />
            <View style={[styles.meridian, { transform: [{ rotate: '120deg' }] }]} />
            <View style={styles.equator} />
          </Animated.View>

          {/* Alert dots — always mounted once the sequence starts, only
              their red/green opacity animates. */}
          {dotsOn &&
            dots.map((d, i) => (
              <View key={i} style={[styles.dotSlot, { transform: [{ translateX: d.x }, { translateY: d.y }] }]}>
                <Animated.View style={[styles.dot, { backgroundColor: '#ff2b2b', opacity: redOpacity }]} />
                <Animated.View style={[styles.dot, { backgroundColor: '#3fe08a', opacity: greenOpacity }]} />
              </View>
            ))}
        </Animated.View>

        <Animated.View
          style={[styles.hero, { transform: [{ translateX: heroX }, { translateY: heroY }, { scale: heroScale }] }]}
        >
          <Guardian pose={pose} />
        </Animated.View>
      </Animated.View>

      <Animated.View style={{ opacity: textFade }}>
        <Text style={styles.title}>Welcome to RESQ 👋</Text>
        <Text style={styles.subtitle}>We're here to get you help, fast, whenever you need it.</Text>
      </Animated.View>

      <Animated.View style={{ opacity: textFade, width: '100%' }}>
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
  dotSlot: { position: 'absolute', width: 10, height: 10 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3 },
  hero: { position: 'absolute', zIndex: 10 },
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
