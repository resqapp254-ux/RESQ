// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { LanguageProvider } from './lib/i18n'
import LogoutButton from './components/LogoutButton'
import WelcomeScreen from './screens/WelcomeScreen'
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

// Every screen a person can land on after signing in gets a header
// with a working "Log out" — no screen should ever be a dead end.
function withLogout(title) {
  return ({ navigation }) => ({
    headerShown: true,
    title,
    headerRight: () => <LogoutButton navigation={navigation} />
  })
}

export default function App() {
  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Welcome" screenOptions={screenOptions}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Bootstrap" component={BootstrapScreen} />
            <Stack.Screen name="LanguageConsent" component={LanguageConsentScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="EnterInstitutionCode" component={EnterInstitutionCodeScreen} options={withLogout('Connect Institution')} />
            <Stack.Screen name="Home" component={UserHomeScreen} options={withLogout('RESQ')} />
            <Stack.Screen name="ManageGuardians" component={ManageGuardiansScreen} options={withLogout('Trusted Contacts')} />
            <Stack.Screen name="UserEmergencyActive" component={UserEmergencyActiveScreen} options={withLogout('Emergency Active')} />
            <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={withLogout('RESQ Responder')} />
            <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={withLogout('Emergency Details')} />
            <Stack.Screen name="InstitutionChat" component={InstitutionChatScreen} options={withLogout('Team Chat')} />
            <Stack.Screen name="AdminWebView" component={AdminWebViewScreen} options={withLogout('RESQ Admin')} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </LanguageProvider>
  )
}
