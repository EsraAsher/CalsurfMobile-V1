// src/screens/AppSettingsScreen.tsx
import React from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';

// Types
type SettingsRow = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route?: string;
  params?: any;
  onPress?: () => void;
  color?: string;
};

// Constants
const SCROLL_THRESHOLD = 50;
const HEADER_HEIGHT = 44;

// --- COMPONENT: SETTINGS ROW ---
const SettingsRowItem = ({ item, colors, isLast }: { item: SettingsRow; colors: any; isLast?: boolean }) => {
  const router = useRouter();
  
  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      if (item.params) {
        router.push({ pathname: item.route as any, params: item.params });
      } else {
        router.push(item.route as any);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row, 
        { borderBottomColor: colors.border },
        !isLast && styles.rowBorder
      ]}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <View style={styles.rowLeft}>
        <Feather 
          name={item.icon} 
          size={24} 
          color={item.color || colors.textPrimary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowTitle, { color: item.color || colors.textPrimary }]}>
          {item.title}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export default function AppSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // Scroll animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated header styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const headerTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD - 20, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const largeTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // App settings items
  const appSettingsItems: SettingsRow[] = [
    { title: 'Theme', icon: 'moon', route: '/settings/theme' },
    { title: 'Notifications', icon: 'bell', route: '/reminders' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Animated Header */}
      <Animated.View 
        style={[
          styles.stickyHeader, 
          { paddingTop: insets.top, backgroundColor: colors.background },
          headerAnimatedStyle
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Animated.Text 
            style={[styles.headerTitle, { color: colors.textPrimary }, headerTitleAnimatedStyle]}
          >
            App Settings
          </Animated.Text>
          <View style={{ width: 28 }} />
        </View>
      </Animated.View>

      {/* Fixed Back Button (Always visible) */}
      <View style={[styles.fixedBackButton, { top: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
      >
        {/* Large Title */}
        <Animated.Text 
          style={[styles.largeTitle, { color: colors.textPrimary }, largeTitleAnimatedStyle]}
        >
          App Settings
        </Animated.Text>

        {/* App Settings List */}
        {appSettingsItems.map((item, index) => (
          <SettingsRowItem 
            key={item.title} 
            item={item} 
            colors={colors}
            isLast={false}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: { 
    padding: 4 
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '600' 
  },
  
  // Fixed back button
  fixedBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 99,
  },
  
  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Large Title
  largeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 8,
  },
  
  // Section Content
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  rowBorder: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
  },
});
