// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../.vscode/src/context/AuthContext';
import { useFonts } from 'expo-font';

import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

import * as SplashScreen from 'expo-splash-screen';
import LoadingSplash from '../components/LoadingSplash';

// 👇 THEME PROVIDER (NEW)
import { ThemeProvider } from '../.vscode/src/context/ThemeContext';

// Bottom sheet requirements
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup =
      segments[0] === 'onboarding' || segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      router.replace('/onboarding');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments]);

  if (loading) return <LoadingSplash />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: '#131313' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="stats" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="insights" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="reminders" options={{ animation: 'slide_from_right' }} />

      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="legalDoc" options={{ animation: 'slide_from_right' }} />

      {/* Settings Screens */}
      <Stack.Screen name="settings/account" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/health-goals" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/app-settings" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/legal" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/get-help" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/surf-ai" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/personal-info" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/security" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/goals" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/theme" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings/delete-account" options={{ animation: 'slide_from_right' }} />

      {/* Modals */}
      <Stack.Screen
        name="support"
        options={{ presentation: 'modal', headerShown: false }}
      />

      {/* Updates page (transparent) */}
      <Stack.Screen
        name="updates"
        options={{
          presentation: 'transparentModal',
          headerShown: false,
          animation: 'none',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
    Poppins_400Regular,
    Poppins_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return <LoadingSplash />;

  return (
    <ThemeProvider> {/* 👈 WRAP APP IN THEME PROVIDER */}
      <AuthProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {/* Status bar is now controlled by ThemeContext */}
            <RootNavigation />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
