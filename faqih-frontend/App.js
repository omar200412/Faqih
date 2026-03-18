// App.js — Faqih Root Navigator with Language Provider

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { LanguageProvider, useLang } from './src/i18n';
import HomeScreen    from './src/screens/HomeScreen';
import QuizScreen    from './src/screens/QuizScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors }    from './src/theme';

const Stack = createStackNavigator();

function AppNavigator() {
  const { t } = useLang();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary, elevation: 0, shadowOpacity: 0 },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Georgia', fontWeight: '700', fontSize: 18 },
          cardStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Home"    component={HomeScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="Quiz"    component={QuizScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t.profile.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppNavigator />
    </LanguageProvider>
  );
}