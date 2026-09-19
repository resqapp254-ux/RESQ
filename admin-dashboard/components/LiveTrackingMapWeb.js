'use client'

// Real tracking viewport for the super-admin Live Routing panel — a
// Leaflet map with a neon-crimson pulsing marker per active emergency.
// Loaded via next/dynamic with ssr:false (Leaflet touches `window` at
// import time), so this file itself can assume the browser exists.

import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'

const pulseIcon = L.divIcon({
  className: '',
  html: '<span class="block h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white animate-neon-pulse" />',
  iconSize: [14, 14],
  iconAnchor: [7, 7]
})

export default function LiveTrackingMapWeb({ routes }) {
  const points = routes.filter((r) => r.lat != null && r.lng != null)

  const center = points.length > 0
    ? [points[0].lat, points[0].lng]
    : [-1.286389, 36.817223] // Nairobi — sane default when nothing is active yet

  return (
    <MapContainer
      center={center}
      zoom={points.length > 0 ? 12 : 6}
      style={{ height: 260, width: '100%', borderRadius: 14 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={pulseIcon} />
      ))}
    </MapContainer>
  )
}
