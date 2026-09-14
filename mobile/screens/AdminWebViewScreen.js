// screens/AdminWebViewScreen.js
// institution_admin and super_admin manage institutions, responders,
// secondary services, and reports — screens that only exist on the
// web dashboard. Rather than rebuild all of that natively, this
// embeds the real, already-branded RESQ web app so admins get the
// exact same experience as on a computer. Sign-in here is separate
// from the native app's session (the WebView keeps its own cookies),
// so it asks for a password once more the first time.

import React, { useRef, useState } from 'react'
import { View, StyleSheet, ActivityIndicator, BackHandler } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { WebView } from 'react-native-webview'
import { API_BASE_URL } from '../lib/config'

export default function AdminWebViewScreen() {
  const webviewRef = useRef(null)
  const [canGoBack, setCanGoBack] = useState(false)
  const [loading, setLoading] = useState(true)

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

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ff2b2b" />
        </View>
      )}
      <WebView
        ref={webviewRef}
        source={{ uri: `${API_BASE_URL}/login` }}
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
