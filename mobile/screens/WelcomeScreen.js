// screens/WelcomeScreen.js
// The very first thing anyone sees, once, on first install — a
// friendly animated shield saying hello before the language/consent
// step. Purely a warm first impression; taps straight through to
// LanguageConsent (which itself only shows once) or Bootstrap on
// every later launch, so this never blocks a returning user.

import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Image, Animated, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const WELCOME_SEEN_KEY = 'resq-welcome-seen'

export default function WelcomeScreen({ navigation }) {
  const bounce = useRef(new Animated.Value(0)).current
  const fade = useRef(new Animated.Value(0)).current
  const wave = useRef(new Animated.Value(0)).current

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
      Animated.spring(bounce, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true })
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(wave, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
      ).start()
    })
  }, [bounce, fade, wave])

  const scale = bounce.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })
  const rotate = wave.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] })

  async function handleContinue() {
    await AsyncStorage.setItem(WELCOME_SEEN_KEY, 'true')
    navigation.replace('LanguageConsent')
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }, { rotate }] }}>
        <Image source={require('../assets/welcome-shield.png')} style={styles.shield} />
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
  shield: { width: 160, height: 160 },
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
