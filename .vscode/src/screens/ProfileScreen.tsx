// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

import { auth, db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';
import * as Application from 'expo-application';

// Types
type SettingsRow = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route?: string;
  params?: any;
  onPress?: () => void;
  color?: string;
};

type SettingsSection = {
  title: string;
  data: SettingsRow[];
};

// Constants
const SCROLL_THRESHOLD = 50;
const HEADER_HEIGHT = 44;

// --- COMPONENT: SETTINGS ROW (Airbnb Style) ---
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

// --- COMPONENT: SECTION ---
const SettingsSectionComponent = ({ section, colors }: { section: SettingsSection; colors: any }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
    <View style={[styles.sectionContent, { backgroundColor: colors.card }]}>
      {section.data.map((item, index) => (
        <SettingsRowItem 
          key={item.title} 
          item={item} 
          colors={colors}
          isLast={index === section.data.length - 1}
        />
      ))}
    </View>
  </View>
);

// --- MAIN SCREEN ---
export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const { colors } = useTheme();
  
  const [name, setName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const appVersion = Application.nativeApplicationVersion || '1.0.0';

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
    
    return {
      opacity,
    };
  });

  const headerTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD - 20, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    
    return {
      opacity,
    };
  });

  const largeTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP
    );
    
    return {
      opacity,
    };
  });

  // Load user data
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAvatar(data.photoURL);
            if (data.displayName) setName(data.displayName);
          }
        } catch (e) {
          console.log('Error fetching profile:', e);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64Img);
      try {
        if (user) await updateDoc(doc(db, 'users', user.uid), { photoURL: base64Img });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            await AsyncStorage.clear();
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  // Settings Data Structure
  const sections: SettingsSection[] = [];

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
          <Animated.Text 
            style={[styles.headerTitle, { color: colors.textPrimary }, headerTitleAnimatedStyle]}
          >
            Profile
          </Animated.Text>
        </View>
      </Animated.View>

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
          Profile
        </Animated.Text>

        {/* User Info Section (Airbnb Style) */}
        <TouchableOpacity style={styles.userSection} onPress={pickImage} activeOpacity={0.7}>
          <View style={styles.userInfo}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitial}>{name ? name[0].toUpperCase() : 'U'}</Text>
                </View>
              )}
              <View style={[styles.cameraIcon, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={12} color="#FFF" />
              </View>
            </View>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{name || 'User'}</Text>
          </View>
        </TouchableOpacity>

        {/* Account Settings Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/account')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="settings" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Account Settings</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Health Goals Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/health-goals')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="heart" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Health Goals</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* App Settings Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/app-settings')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="sliders" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>App Settings</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Legal Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/legal')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="file-text" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Legal</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Get Help Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/get-help')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="help-circle" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Get Help</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Surf AI Button */}
        <TouchableOpacity 
          style={styles.accountSettingsButton}
          onPress={() => router.push('/settings/surf-ai')}
          activeOpacity={0.6}
        >
          <View style={styles.rowLeft}>
            <Feather name="cpu" size={24} color={colors.textPrimary} style={styles.rowIcon} />
            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Surf AI</Text>
          </View>
          <Feather name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Settings Sections */}
        {sections.map((section) => (
          <SettingsSectionComponent key={section.title} section={section} colors={colors} />
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
          </TouchableOpacity>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            Version {appVersion}
          </Text>
        </View>
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
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
  },
  headerTitle: { 
    fontSize: 17, 
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_700Bold',
    marginBottom: 24,
    marginTop: 8,
  },
  
  // User Section (Airbnb Style)
  userSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    marginBottom: 32,
  },
  userInfo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFF',
  },
  userText: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
  },
  
  // Account Settings Button
  accountSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
    marginBottom: 0,
  },
  
  // Section
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // Row (Airbnb Style - Clean)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    fontFamily: 'DMSans_400Regular',
    flex: 1,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 20,
  },
  logoutButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  logoutText: {
    fontSize: 17,
    fontWeight: '500',
    fontFamily: 'DMSans_500Medium',
  },
  versionText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginTop: 8,
  },
});
