// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { LanguageProvider } from './lib/i18n'
import BootstrapScreen from './screens/BootstrapScreen'
import LanguageConsentScreen from './screens/LanguageConsentScreen'
import AuthScreen from './screens/AuthScreen'
import EnterInstitutionCodeScreen from './screens/EnterInstitutionCodeScreen'
import ResponderHomeScreen from './screens/ResponderHomeScreen'
import EmergencyDetailScreen from './screens/EmergencyDetailScreen'
import UserHomeScreen from './screens/UserHomeScreen'
import UserEmergencyActiveScreen from './screens/UserEmergencyActiveScreen'
import ManageGuardiansScreen from './screens/ManageGuardiansScreen'
import AdminWebViewScreen from './screens/AdminWebViewScreen'
import InstitutionChatScreen from './screens/InstitutionChatScreen'

const Stack = createNativeStackNavigator()

const screenOptions = {
  headerShown: false,
  headerStyle: { backgroundColor: '#0b1024' },
  headerTintColor: '#f4f6fb',
  contentStyle: { backgroundColor: '#05070d' }
}

export default function App() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Bootstrap" screenOptions={screenOptions}>
            <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
            <Stack.Screen name="LanguageConsent" component={LanguageConsentScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="EnterInstitutionCode" component={EnterInstitutionCodeScreen} />
            <Stack.Screen name="Home" component={UserHomeScreen} />
            <Stack.Screen name="ManageGuardians" component={ManageGuardiansScreen} options={{ headerShown: true, title: 'Trusted Contacts' }} />
            <Stack.Screen name="UserEmergencyActive" component={UserEmergencyActiveScreen} options={{ headerShown: true, title: 'Emergency Active' }} />
            <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={{ headerShown: true, title: 'RESQ Responder' }} />
            <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={{ headerShown: true, title: 'Emergency Details' }} />
            <Stack.Screen name="InstitutionChat" component={InstitutionChatScreen} options={{ headerShown: true, title: 'Team Chat' }} />
            <Stack.Screen name="AdminWebView" component={AdminWebViewScreen} options={{ headerShown: true, title: 'RESQ Admin' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </LanguageProvider>
  )
}
