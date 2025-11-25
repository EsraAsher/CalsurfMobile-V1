// app/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AuthProvider, useAuth } from '../.vscode/src/context/AuthContext';
import AuthScreen from '../.vscode/src/screens/AuthScreen'; // Import the new screen

// We split this into a sub-component so we can use the 'useAuth' hook
function RootNavigation() {
  const { user, loading } = useAuth();

  // 1. Show Loading Screen while Firebase connects
  if (loading) {
    return null; // Or a splash screen
  }

  // 2. If NO user, show Login Screen
  if (!user) {
    return <AuthScreen />;
  }

  // 3. If User exists, show the App
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: '#181621' }
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="stats" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="insights" options={{ animation: 'slide_from_right' }} />
      {/* Prevent users from navigating to 'voice' manually if needed */}
      <Stack.Screen name="voice" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider> 
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <RootNavigation />
      </SafeAreaProvider>
    </AuthProvider>
  );
}