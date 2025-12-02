// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register for push notifications when user is logged in
  usePushNotifications();

  useEffect(() => {
    console.log("AuthContext: Setting up listener...");
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("AuthContext: User logged in:", currentUser.email);
      } else {
        console.log("AuthContext: User logged OUT");
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // We don't return a loading spinner here anymore, 
  // we let the Layout handle it so we can show the Splash Screen instead.
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}