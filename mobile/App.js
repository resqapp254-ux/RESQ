// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import EnterInstitutionCodeScreen from './screens/EnterInstitutionCodeScreen'
import ResponderHomeScreen from './screens/ResponderHomeScreen'
import EmergencyDetailScreen from './screens/EmergencyDetailScreen'
import UserHomeScreen from './screens/UserHomeScreen'
import UserEmergencyActiveScreen from './screens/UserEmergencyActiveScreen'

const Stack = createNativeStackNavigator()

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="EnterInstitutionCode" component={EnterInstitutionCodeScreen} />
        <Stack.Screen name="Home" component={UserHomeScreen} />
        <Stack.Screen name="UserEmergencyActive" component={UserEmergencyActiveScreen} options={{ headerShown: true, title: 'Emergency Active' }} />
        <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={{ headerShown: true, title: 'RESQ Responder' }} />
        <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={{ headerShown: true, title: 'Emergency Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
