// lib/notifications.js
//
// Handles registering the device for push notifications and
// configuring an Android notification channel that requests to
// bypass Do Not Disturb / silent mode for incoming emergencies.
//
// IMPORTANT LIMITATION: Android still requires the person to
// manually grant "Do Not Disturb access" to RESQ in their phone's
// system settings for the bypass to actually work — no app can
// silently grant itself this permission. We prompt for it below,
// but the person must approve it in the settings screen that opens.

import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
})

const CHANNEL_ID = 'resq-emergency-alerts'

export async function setupEmergencyNotificationChannel() {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Emergency Alerts',
    importance: Notifications.AndroidImportance.MAX,
    // Attempts to bypass Do Not Disturb — requires the user to grant
    // "Do Not Disturb access" to RESQ in Android system settings.
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#FF0000'
  })
}

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device, not a simulator.')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission was not granted.')
    return null
  }

  await setupEmergencyNotificationChannel()

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  // Save this token to the responder's profile so the server can reach them
  const { data: userData } = await supabase.auth.getUser()
  if (userData.user) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', userData.user.id)
  }

  return token
}
