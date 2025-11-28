// app/_layout.tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../.vscode/src/context/AuthContext';
import { useFonts } from 'expo-font';
import { Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { Poppins_400Regular, Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import LoadingSplash from '../components/LoadingSplash';
import { COLORS } from '../.vscode/src/theme';

// 👇 REQUIRED FOR BOTTOM SHEET
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'onboarding' || segments[0] === 'auth';
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
        contentStyle: { backgroundColor: '#131313' }
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
      
      {/* Modals */}
      <Stack.Screen 
        name="support" 
        options={{ presentation: 'modal', headerShown: false }} 
      />
      {/* 👇 UPDATES PAGE (Transparent modal so you see the home screen behind it) */}
      <Stack.Screen 
        name="updates" 
        options={{ 
          presentation: 'transparentModal', 
          headerShown: false,
          animation: 'fade'
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Montserrat_400Regular, Montserrat_700Bold,
    Poppins_400Regular, Poppins_600SemiBold,
    Inter_400Regular, Inter_600SemiBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return <LoadingSplash />;

  return (
    <AuthProvider> 
      <SafeAreaProvider>
        {/* 👇 WRAP THE WHOLE APP */}
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" />
          <RootNavigation />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </AuthProvider>
  );
}