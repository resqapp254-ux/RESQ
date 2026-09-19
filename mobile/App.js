// App.js
import React from 'react'
import * as Sentry from '@sentry/react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

Sentry.init({
  dsn: 'https://8d77a4b207ade3ee2dea53688c29b0a8@o4512097028014080.ingest.us.sentry.io/4512097037451264',
  tracesSampleRate: 0.2,
  enableAutoSessionTracking: true,
})

import { TouchableOpacity, Text, View } from 'react-native'
import { LanguageProvider } from './lib/i18n'
import LogoutButton from './components/LogoutButton'
import AccountScreen from './screens/AccountScreen'
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
import MyInstitutionsScreen from './screens/MyInstitutionsScreen'

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

// The two screens a self-registered account (user or responder) lands
// on also get an "Account" entry point, since that's where Play Store
// review expects to find self-service account deletion.
function withAccountAndLogout(title) {
  return ({ navigation }) => ({
    headerShown: true,
    title,
    headerRight: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Account')}
          style={{ paddingHorizontal: 8, paddingVertical: 6 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: '#7fe3f2', fontWeight: '600', fontSize: 14 }}>Account</Text>
        </TouchableOpacity>
        <LogoutButton navigation={navigation} />
      </View>
    )
  })
}

function App() {
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
            <Stack.Screen name="Home" component={UserHomeScreen} options={withAccountAndLogout('RESQ')} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ headerShown: true, title: 'Account' }} />
            <Stack.Screen name="ManageGuardians" component={ManageGuardiansScreen} options={withLogout('Trusted Contacts')} />
            <Stack.Screen name="UserEmergencyActive" component={UserEmergencyActiveScreen} options={withLogout('Emergency Active')} />
            <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={withAccountAndLogout('RESQ Responder')} />
            <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={withLogout('Emergency Details')} />
            <Stack.Screen name="InstitutionChat" component={InstitutionChatScreen} options={withLogout('Team Chat')} />
            <Stack.Screen name="MyInstitutions" component={MyInstitutionsScreen} options={withLogout('My Institutions')} />
            <Stack.Screen name="AdminWebView" component={AdminWebViewScreen} options={withLogout('RESQ Admin')} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </LanguageProvider>
  )
}

export default Sentry.wrap(App)
