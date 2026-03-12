// App.js — Faqih Root Navigator

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, Text } from 'react-native';

import HomeScreen    from './src/screens/HomeScreen';
import QuizScreen    from './src/screens/QuizScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors }    from './src/theme';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontFamily: 'Georgia',
            fontWeight: '700',
            fontSize: 18,
          },
          cardStyle: { backgroundColor: colors.bg },
        }}
      >
        {/* Home — no default header, screen has its own */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />

        {/* Quiz — minimal header with unit title */}
        <Stack.Screen
          name="Quiz"
          component={QuizScreen}
          options={({ route }) => ({
            headerShown: false,  // QuizScreen has its own header
          })}
        />

        {/* Profile */}
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: 'Profilim' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}