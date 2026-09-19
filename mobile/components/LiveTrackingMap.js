// components/LiveTrackingMap.js
// Compact in-app map anchoring an emergency's live location — replaces
// "tap to open Google Maps" with an actual tracking viewport, with a
// neon-crimson pulsing marker so the exact spot reads instantly.

import React from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { MotiView } from 'moti'

export default function LiveTrackingMap({ lat, lng, height = 180 }) {
  if (lat == null || lng == null) return null

  const region = {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        region={region}
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

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(63,63,70,0.5)' },
  markerAnchor: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444' },
  markerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' }
})
