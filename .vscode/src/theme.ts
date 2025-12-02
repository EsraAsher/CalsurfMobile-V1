// src/theme.ts

export interface ThemeColors {
  background: string;
  card: string;
  cardHighlight: string;
  
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  primary: string;   // Brand Blue
  secondary: string; 
  accent: string;
  neon: string;      // Brand Neon
  onGradientText: string;
  
  success: string;
  danger: string;
  inputBg: string;
  border: string;
  
  statusBarStyle: 'light-content' | 'dark-content';
  
  gradients: {
    calories: readonly [string, string, string];
    protein: readonly [string, string, string];
    eaten: readonly [string, string, string];
  };
}

export const SPACING = { s: 8, m: 16, l: 24, xl: 32 };
export const RADIUS = { s: 12, m: 16, l: 24, xl: 32 };
export const FONTS = {
  heading: 'Montserrat_700Bold',
  sub: 'Poppins_600SemiBold',
  body: 'DMSans_400Regular',
};

export const THEMES: Record<'light' | 'dark', ThemeColors> = {
  // 🌑 DARK MODE (Your original Neon Theme)
  dark: {
    background: '#131313',
    card: '#1C1C1E',
    cardHighlight: '#2C2C2E',
    textPrimary: '#FFFFFF',
    textSecondary: '#EAE8F3',
    textMuted: '#888888',
    primary: '#1C46F5',
    secondary: '#3E7AEE',
    accent: '#DF5591',
    neon: '#D2FF52',
    onGradientText: '#FFFFFF',
    success: '#4ADE80',
    danger: '#FF453A',
    inputBg: '#1A1A1A',
    border: '#333333',
    statusBarStyle: 'light-content',
    gradients: {
      calories: ['#8d49fd', '#7f56f3', '#5691f3'], 
      protein: ['#FF8C42', '#FF512F', '#DD2476'], 
      eaten: ['#34D399', '#10B981', '#059669'],   
    }
  },

  // ☀️ LIGHT MODE (Clean, High Contrast)
  light: {
    background: '#FFFFFF',
    card: '#F4F4F5', // Subtle Gray
    cardHighlight: '#E4E4E7',
    textPrimary: '#09090B', // Nearly Black
    textSecondary: '#52525B',
    textMuted: '#A1A1AA',
    primary: '#1C46F5', // Same Brand Blue
    secondary: '#3B82F6',
    accent: '#EC4899',
    neon: '#D2FF52', // Keep neon for brand identity elements
    onGradientText: '#FFFFFF',
    success: '#16A34A', // Darker green for visibility on white
    danger: '#DC2626', // Darker red
    inputBg: '#FAFAFA',
    border: '#E4E4E7',
    statusBarStyle: 'dark-content',
    gradients: {
      // Slightly adjusted gradients to pop on white
      calories: ['#8B5CF6', '#7C3AED', '#6366F1'], 
      protein: ['#FB923C', '#F97316', '#EA580C'], 
      eaten: ['#4ADE80', '#22C55E', '#16A34A'],   
    }
  },
};

// Default export for safety
export const COLORS = THEMES.dark;