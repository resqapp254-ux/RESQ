// components/SignOutOverlay.js
// Shown while signing out of any screen: the guardian flies in from a
// random edge each time, waves goodbye, then onComplete actually signs
// out and resets navigation. Rendered as a full-screen Modal so it
// covers whatever screen was open, regardless of navigation state.

import React, { useEffect, useRef, useState } from 'react'
import { Modal, View, Text, Animated, StyleSheet, Dimensions } from 'react-native'
import Guardian from './Guardian'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

function randomStart() {
  const edge = Math.floor(Math.random() * 4)
  const along = 0.15 + Math.random() * 0.7
  if (edge === 0) return { x: SCREEN_W * along, y: -80 }
  if (edge === 1) return { x: SCREEN_W + 80, y: SCREEN_H * along }
  if (edge === 2) return { x: SCREEN_W * along, y: SCREEN_H + 80 }
  return { x: -80, y: SCREEN_H * along }
}

export default function SignOutOverlay({ visible, onComplete }) {
  const [start] = useState(randomStart)
  const [waved, setWaved] = useState(false)
  const pos = useRef(new Animated.ValueXY(start)).current
  const textFade = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (!visible) return
    const center = { x: SCREEN_W / 2 - 30, y: SCREEN_H / 2 - 38 }

    Animated.timing(pos, { toValue: center, duration: 900, useNativeDriver: true }).start(() => {
      setWaved(true)
      Animated.timing(textFade, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    })

    const t = setTimeout(() => onComplete?.(), 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible) return null

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={{ position: 'absolute', transform: [{ translateX: pos.x }, { translateY: pos.y }] }}>
          <Guardian pose={waved ? 'wave' : 'fly'} />
        </Animated.View>
        {waved && (
          <Animated.View style={[styles.textWrap, { opacity: textFade }]}>
            <Text style={styles.title}>See you soon 👋</Text>
            <Text style={styles.subtitle}>Signing you out…</Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(5,7,13,0.94)' },
  textWrap: { position: 'absolute', top: SCREEN_H * 0.6, width: '100%', alignItems: 'center' },
  title: { color: '#f4f6fb', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9aa4bf', fontSize: 13, marginTop: 4 }
})
