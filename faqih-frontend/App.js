// App.js — Faqih Root Navigator with Language Provider

import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import CoursesScreen from './src/screens/CoursesScreen';
import QuestsScreen  from './src/screens/QuestsScreen';
import { colors, fonts } from './src/theme';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Lesson"   component={LessonScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { t } = useLang();
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={({ route }) => {
            const focusedRoute = getFocusedRouteNameFromRoute(route) ?? 'HomeMain';
            return {
              tabBarLabel: t.nav.home,
              tabBarIcon: () => <Text>🏠</Text>,
              tabBarStyle: focusedRoute === 'Lesson' ? { display: 'none' } : undefined,
            };
          }}
        />
        <Tab.Screen name="Courses" component={CoursesScreen} options={{ tabBarLabel: t.nav.courses, tabBarIcon: () => <Text>📚</Text> }} />
        <Tab.Screen name="Quests"  component={QuestsScreen}  options={{ tabBarLabel: t.nav.quests,  tabBarIcon: () => <Text>🎯</Text> }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t.profile.title, tabBarIcon: () => <Text>👤</Text> }} />
      </Tab.Navigator>
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
