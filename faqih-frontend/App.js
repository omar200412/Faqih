// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{
          headerStyle: { backgroundColor: '#006728' }, 
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {}
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Faqih - Dersler' }} />
        <Stack.Screen name="Quiz" component={QuizScreen} options={{ title: 'Soru Çöz' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}