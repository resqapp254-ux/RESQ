// components/EmergencyRoutingMap.js
'use client'

import dynamic from 'next/dynamic'

const EmergencyRoutingMapInner = dynamic(() => import('./EmergencyRoutingMapInner'), {
  ssr: false,
  loading: () => <p className="resq-subtle">Loading map…</p>
})

export default function EmergencyRoutingMap(props) {
  return <EmergencyRoutingMapInner {...props} />
}
