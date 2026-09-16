// screens/AdminWebViewScreen.js
// institution_admin and super_admin manage institutions, responders,
// secondary services, and reports — screens that only exist on the
// web dashboard. Rather than rebuild all of that natively, this
// embeds the real, already-branded RESQ web app so admins get the
// exact same experience as on a computer.
//
// The WebView keeps its own separate session from the native app, so
// it used to ask for a password a second time on every open — the
// native app's already-established Supabase session is now handed to
// a bridge page (see app/auth/mobile-bridge) via the URL fragment,
// which signs the WebView in silently and lands straight on the
// dashboard instead.

import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { supabase } from '../lib/supabase'
import { API_BASE_URL } from '../lib/config'

export default function AdminWebViewScreen() {
  const webviewRef = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bridgeUrl, setBridgeUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function buildBridgeUrl() {
      const { data } = await supabase.auth.getSession()
      const session = data.session
      if (!session) {
        if (!cancelled) setBridgeUrl(`${API_BASE_URL}/login`)
        return
      }
      const hash = `access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`
      if (!cancelled) setBridgeUrl(`${API_BASE_URL}/auth/mobile-bridge#${hash}`)
    }
    buildBridgeUrl()
    return () => {
      cancelled = true
    }
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      function onBackPress() {
        if (canGoBack && webviewRef.current) {
          webviewRef.current.goBack()
          return true
        }
        return false
      }
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
      return () => subscription.remove()
    }, [canGoBack])
  )

  if (!bridgeUrl) {
    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="large" color="#ff2b2b" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff2b2b" />
        </View>
      )}
      <WebView
        ref={webviewRef}
        source={{ uri: bridgeUrl }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        startInLoadingState={false}
        pullToRefreshEnabled
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070d' },
  webview: { flex: 1, backgroundColor: '#05070d' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05070d',
    zIndex: 1
  }
})
