// App.js — Faqih Root Navigator with Language Provider

import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import { LanguageProvider, useLang } from './src/i18n';
import HomeScreen    from './src/screens/HomeScreen';
import LessonScreen  from './src/screens/LessonScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors, fonts } from './src/theme';

const Stack = createStackNavigator();

function AppNavigator() {
  const { t } = useLang();
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary, elevation: 0, shadowOpacity: 0 },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: fonts.heading, fontSize: 18 },
          cardStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Home"    component={HomeScreen}    options={{ headerShown: false }} />
        <Stack.Screen name="Lesson"  component={LessonScreen}  options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: t.profile.title }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <LanguageProvider>
      <AppNavigator />
    </LanguageProvider>
  );
}