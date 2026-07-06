// App.js
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { View, Text } from 'react-native'

import LoginScreen from './screens/LoginScreen'
import SignUpScreen from './screens/SignUpScreen'
import EnterInstitutionCodeScreen from './screens/EnterInstitutionCodeScreen'
import ResponderHomeScreen from './screens/ResponderHomeScreen'
import EmergencyDetailScreen from './screens/EmergencyDetailScreen'

const Stack = createNativeStackNavigator()

// Placeholder — real emergency trigger screen for users arrives Day 6
function UserHomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Logged in as user. Emergency trigger button arrives Day 6.</Text>
    </View>
  )
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="EnterInstitutionCode" component={EnterInstitutionCodeScreen} />
        <Stack.Screen name="Home" component={UserHomeScreen} />
        <Stack.Screen name="ResponderHome" component={ResponderHomeScreen} options={{ headerShown: true, title: 'RESQ Responder' }} />
        <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} options={{ headerShown: true, title: 'Emergency Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
