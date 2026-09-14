// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import EnterInstitutionCodeScreen from './screens/EnterInstitutionCodeScreen'
import ResponderHomeScreen from './screens/ResponderHomeScreen'
import EmergencyDetailScreen from './screens/EmergencyDetailScreen'
import UserHomeScreen from './screens/UserHomeScreen'
import UserEmergencyActiveScreen from './screens/UserEmergencyActiveScreen'
import ManageGuardiansScreen from './screens/ManageGuardiansScreen'
import AdminWebViewScreen from './screens/AdminWebViewScreen'

const Stack = createNativeStackNavigator()

const screenOptions = {
  headerShown: false,
  headerStyle: { backgroundColor: '#0b1024' },
  headerTintColor: '#f4f6fb',
  contentStyle: { backgroundColor: '#05070d' }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={screenOptions}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="EnterInstitutionCode" component={EnterInstitutionCodeScreen} />
          <Stack.Screen name="Home" component={UserHomeScreen} />
          <Stack.Screen name="ManageGuardians" component={ManageGuardiansScreen} options={{ headerShown: true, title: 'Trusted Contacts' }} />
          <Stack.Screen name="UserEmergencyActive" component={UserEmergencyActiveScreen} options={{ headerShown: true, title: 'Emergency Active' }} />
          <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={{ headerShown: true, title: 'RESQ Responder' }} />
          <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={{ headerShown: true, title: 'Emergency Details' }} />
          <Stack.Screen name="AdminWebView" component={AdminWebViewScreen} options={{ headerShown: true, title: 'RESQ Admin' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
