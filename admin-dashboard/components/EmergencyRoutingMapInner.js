// components/EmergencyRoutingMapInner.js
// The actual Leaflet map — kept in its own file and only ever loaded via
// next/dynamic with ssr:false from EmergencyRoutingMap.js, because
// leaflet touches `window` at import time and would break server
// rendering if imported directly into a page.
'use client'

import { Fragment } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'

function emojiIcon(emoji, size = 26) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))">${emoji}</div>`,
    className: 'resq-map-emoji-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}

const INSTITUTION_ICON = emojiIcon('🏢')
const UNIT_ICON = emojiIcon('🏥', 22)
const ACTIVE_EMERGENCY_ICON = emojiIcon('🚨', 22)
const RESOLVED_EMERGENCY_ICON = emojiIcon('✅', 18)

export default function EmergencyRoutingMapInner({ institutions, units, emergencies }) {
  const points = [
    ...institutions.map((i) => [i.lat, i.lng]),
    ...units.map((u) => [u.lat, u.lng]),
    ...emergencies.map((e) => [e.lat, e.lng])
  ]
  const center = points.length > 0
    ? [points.reduce((s, p) => s + p[0], 0) / points.length, points.reduce((s, p) => s + p[1], 0) / points.length]
    : [0, 0]

  const institutionById = {}
  for (const i of institutions) institutionById[i.id] = i
  const unitById = {}
  for (const u of units) unitById[u.id] = u

  return (
    <MapContainer center={center} zoom={points.length > 0 ? 6 : 2} style={{ height: 480, width: '100%', borderRadius: 12 }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {institutions.map((inst) => (
        <Marker key={`inst-${inst.id}`} position={[inst.lat, inst.lng]} icon={INSTITUTION_ICON}>
          <Popup>
            <strong>{inst.name}</strong><br />
            {inst.visibility === 'public' ? 'Public institution' : 'Private institution'}
          </Popup>
        </Marker>
      ))}

      {units.map((unit) => (
        <Marker key={`unit-${unit.id}`} position={[unit.lat, unit.lng]} icon={UNIT_ICON}>
          <Popup>
            <strong>{unit.name}</strong><br />
            Partner unit ({unit.service_type || 'unit'})
          </Popup>
        </Marker>
      ))}

      {emergencies.map((e) => {
        const isResolved = e.status === 'resolved'
        const routedTo = institutionById[e.institution_id]
        return (
          <Fragment key={e.id}>
            <Marker position={[e.lat, e.lng]} icon={isResolved ? RESOLVED_EMERGENCY_ICON : ACTIVE_EMERGENCY_ICON}>
              <Popup>
                <strong>{e.emergency_type || 'Emergency'}</strong><br />
                Status: {e.status}<br />
                Routed to: {routedTo?.name || 'Unknown institution'}<br />
                {new Date(e.created_at).toLocaleString()}
              </Popup>
            </Marker>
            {routedTo?.lat != null && (
              <Polyline
                positions={[[e.lat, e.lng], [routedTo.lat, routedTo.lng]]}
                pathOptions={{ color: isResolved ? '#3fe08a' : '#ff2b2b', weight: 2, opacity: 0.6, dashArray: isResolved ? '4 6' : null }}
              />
            )}
          </Fragment>
        )
      })}
    </MapContainer>
  )
}
