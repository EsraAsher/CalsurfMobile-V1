// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEMES, ThemeColors } from '../theme';
import { StatusBar } from 'react-native';

// The modes the user can select
export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';   // The actual active theme
  mode: ThemeMode;           // The user's preference
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemScheme = useColorScheme(); // 'light' or 'dark' from OS
  const [mode, setModeState] = useState<ThemeMode>('light'); // Default to light on first launch

  // 1. Load saved preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem('user_theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved as ThemeMode);
      }
      // If no saved preference, stays as 'light' (default)
    };
    loadTheme();
  }, []);

  // 2. Save preference when changed
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('user_theme_mode', newMode);
  };

  // 3. Calculate Active Theme
  // If system, use OS setting. If specific, use that. Fallback to light.
  const activeTheme = mode === 'system' ? (systemScheme || 'light') : mode;
  const colors = THEMES[activeTheme];

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, mode, colors, setMode }}>
      <StatusBar 
        barStyle={colors.statusBarStyle} 
        backgroundColor={colors.background}
      />
      {children}
    </ThemeContext.Provider>
  );
};