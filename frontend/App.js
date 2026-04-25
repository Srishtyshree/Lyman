import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFonts,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SavedScreen } from './src/screens/SavedScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ArticleDetailScreen } from './src/screens/ArticleDetailScreen';
import { NotesScreen } from './src/screens/NotesScreen';
import { PrivacyPolicyScreen } from './src/screens/PrivacyPolicyScreen';
import { HelpScreen } from './src/screens/HelpScreen';
import { SecurityScreen } from './src/screens/SecurityScreen';
import { supabase } from './src/utils/supabase';
import { SavedProvider } from './src/context/SavedContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Saved') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Notes') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#D97B47',
        tabBarInactiveTintColor: theme.isDark ? '#6B6B6B' : '#A09690',
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_700Bold',
          fontSize: 10,
          color: theme.colors.textSecondary,
        }
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Notes" component={NotesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Load fonts at the root level — available to ALL screens
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  // Block render until fonts AND session check are both done
  if (!isReady || !fontsLoaded) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#D97B47" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SavedProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!session ? (
                <>
                  <Stack.Screen name="Welcome" component={WelcomeScreen} />
                  <Stack.Screen name="Auth" component={AuthScreen} />
                </>
              ) : (
                <>
                  <Stack.Screen name="Main" component={TabNavigator} />
                  <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
                  <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
                  <Stack.Screen name="Help" component={HelpScreen} />
                  <Stack.Screen name="Security" component={SecurityScreen} />
                </>
              )}
            </Stack.Navigator>
            <StatusBar style="auto" />
          </NavigationContainer>
        </SavedProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: '#FAF4F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
