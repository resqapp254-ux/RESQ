// components/LiveTrackingMap.js
// Compact in-app map anchoring an emergency's live location — replaces
// "tap to open Google Maps" with an actual tracking viewport, with a
// neon-crimson pulsing marker so the exact spot reads instantly.
//
// The parent screen re-renders on every Realtime change to the
// emergency row — a chat flag, an AI-advice update, a status change —
// not just when lat/lng actually move. Two things used to make that
// expensive:
//   1. A controlled `region` prop rebuilt as a new object every
//      render, which fights react-native-maps' own gesture handling
//      and can visibly snap/re-center the camera on every unrelated
//      update, not just a real location change.
//   2. No memoization, so this (and its native map view + looping
//      pulse animation) re-rendered on every parent update regardless
//      of whether lat/lng changed at all.
// `initialRegion` alone lets the user pan/zoom freely and only seeds
// the camera once; React.memo below skips re-rendering entirely
// unless lat/lng/height actually changed.

import React from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { MotiView } from 'moti'

function LiveTrackingMap({ lat, lng, height = 180 }) {
  if (lat == null || lng == null) return null

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
        pointerEvents="none"
      >
        <Marker coordinate={{ latitude: lat, longitude: lng }} tracksViewChanges={false}>
          <View style={styles.markerAnchor}>
            <MotiView
              from={{ opacity: 0.55, scale: 1 }}
              animate={{ opacity: 0, scale: 2.4 }}
              transition={{ type: 'timing', duration: 1600, loop: true }}
              style={styles.pulseRing}
            />
            <View style={styles.markerDot} />
          </View>
        </Marker>
      </MapView>
    </View>
  )
}

export default React.memo(LiveTrackingMap, (prev, next) =>
  prev.lat === next.lat && prev.lng === next.lng && prev.height === next.height
)

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(63,63,70,0.5)' },
  markerAnchor: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444' },
  markerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' }
})
