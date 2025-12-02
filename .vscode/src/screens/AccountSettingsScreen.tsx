// src/screens/AccountSettingsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withTiming,
  FadeIn,
  FadeOut,
  Layout
} from 'react-native-reanimated';

import { auth, db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

// Types
type EditableField = 'name' | 'email' | 'password' | null;

type EditableRowProps = {
  label: string;
  value: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => void;
  onCancel: () => void;
  colors: any;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  isPassword?: boolean;
};

type PasswordRowProps = {
  isEditing: boolean;
  onEdit: () => void;
  onSave: (currentPassword: string, newPassword: string) => void;
  onCancel: () => void;
  colors: any;
};

// Constants
const SCROLL_THRESHOLD = 50;
const HEADER_HEIGHT = 44;

// --- COMPONENT: EDITABLE ROW ---
const EditableRowItem = ({ 
  label, 
  value, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  colors,
  keyboardType = 'default',
  autoCapitalize = 'words'
}: EditableRowProps) => {
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing) {
      setInputValue(value);
      // Focus the input when editing starts
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isEditing, value]);

  const handleSave = () => {
    onSave(inputValue.trim());
  };

  const handleCancel = () => {
    setInputValue(value);
    onCancel();
  };

  if (isEditing) {
    return (
      <Animated.View 
        style={styles.editableRow}
        entering={FadeIn.duration(200)}
        layout={Layout.springify()}
      >
        <View style={styles.editableRowLeft}>
          <Text style={[styles.editableLabel, { color: colors.textMuted }]}>{label}</Text>
          <TextInput
            ref={inputRef}
            style={[
              styles.inlineInput, 
              { 
                backgroundColor: colors.card, 
                color: colors.textPrimary,
                borderColor: colors.primary
              }
            ]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={`Enter your ${label.toLowerCase()}`}
            placeholderTextColor={colors.textMuted}
            autoCapitalize={autoCapitalize}
            keyboardType={keyboardType}
          />
          <View style={styles.inlineButtonsRow}>
            <TouchableOpacity 
              onPress={handleCancel} 
              style={[styles.inlineButton, styles.cancelButton]}
              activeOpacity={0.6}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.inlineButton, styles.saveButtonContainer, { backgroundColor: colors.primary }]}
              activeOpacity={0.6}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={styles.editableRow}
      layout={Layout.springify()}
    >
      <View style={styles.editableRowLeft}>
        <Text style={[styles.editableLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.editableValue, { color: colors.textPrimary }]}>{value || 'Not set'}</Text>
      </View>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.6}>
        <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- COMPONENT: PASSWORD ROW ---
const PasswordRowItem = ({ 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  colors 
}: PasswordRowProps) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const currentPasswordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => currentPasswordRef.current?.focus(), 100);
    }
  }, [isEditing]);

  const handleSave = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    onSave(currentPassword, newPassword);
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onCancel();
  };

  if (isEditing) {
    return (
      <Animated.View 
        style={styles.editableRow}
        entering={FadeIn.duration(200)}
        layout={Layout.springify()}
      >
        <View style={styles.editableRowLeft}>
          <Text style={[styles.editableLabel, { color: colors.textMuted }]}>Change Password</Text>
          
          <TextInput
            ref={currentPasswordRef}
            style={[
              styles.inlineInput, 
              styles.passwordInput,
              { 
                backgroundColor: colors.card, 
                color: colors.textPrimary,
                borderColor: colors.border
              }
            ]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TextInput
            style={[
              styles.inlineInput, 
              styles.passwordInput,
              { 
                backgroundColor: colors.card, 
                color: colors.textPrimary,
                borderColor: colors.border
              }
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <TextInput
            style={[
              styles.inlineInput, 
              styles.passwordInput,
              { 
                backgroundColor: colors.card, 
                color: colors.textPrimary,
                borderColor: colors.border
              }
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          
          <View style={styles.inlineButtonsRow}>
            <TouchableOpacity 
              onPress={handleCancel} 
              style={[styles.inlineButton, styles.cancelButton]}
              activeOpacity={0.6}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.inlineButton, styles.saveButtonContainer, { backgroundColor: colors.primary }]}
              activeOpacity={0.6}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={styles.editableRow}
      layout={Layout.springify()}
    >
      <View style={styles.editableRowLeft}>
        <Text style={[styles.editableLabel, { color: colors.textMuted }]}>Password</Text>
        <Text style={[styles.editableValue, { color: colors.textPrimary }]}>••••••••</Text>
      </View>
      <TouchableOpacity onPress={onEdit} activeOpacity={0.6}>
        <Text style={[styles.editButton, { color: colors.primary }]}>Edit</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function AccountSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = auth.currentUser;

  // State for user data
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // State for editing
  const [editingField, setEditingField] = useState<EditableField>(null);

  // Scroll animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Load user data
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setEmail(user.email || '');
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setName(data.displayName || user.displayName || '');
          }
        } catch (e) {
          console.log('Error fetching user data:', e);
        }
      }
    };
    fetchUserData();
  }, [user]);

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

  // Handle save
  const handleSave = async (field: EditableField, value: string) => {
    if (!user || !field) return;

    try {
      if (field === 'name') {
        await updateDoc(doc(db, 'users', user.uid), { displayName: value });
        setName(value);
      }
      // Note: Email change requires re-authentication in Firebase
      // For now, we only support name editing
    } catch (e) {
      console.error('Error updating user data:', e);
    }
    
    setEditingField(null);
  };

  // Handle password change
  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) return;

    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      Alert.alert('Success', 'Your password has been updated successfully');
      setEditingField(null);
    } catch (e: any) {
      console.error('Error updating password:', e);
      if (e.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else if (e.code === 'auth/weak-password') {
        Alert.alert('Error', 'Password is too weak. Please use a stronger password');
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again');
      }
    }
  };

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
            Account Settings
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
          Account Settings
        </Animated.Text>

        {/* Editable Fields */}
        <View style={styles.editableSection}>
          <EditableRowItem 
            label="Name" 
            value={name}
            isEditing={editingField === 'name'}
            onEdit={() => setEditingField('name')}
            onSave={(value) => handleSave('name', value)}
            onCancel={() => setEditingField(null)}
            colors={colors}
            autoCapitalize="words"
          />
          <EditableRowItem 
            label="Email" 
            value={email}
            isEditing={editingField === 'email'}
            onEdit={() => setEditingField('email')}
            onSave={(value) => handleSave('email', value)}
            onCancel={() => setEditingField(null)}
            colors={colors}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <PasswordRowItem
            isEditing={editingField === 'password'}
            onEdit={() => setEditingField('password')}
            onSave={handlePasswordChange}
            onCancel={() => setEditingField(null)}
            colors={colors}
          />
        </View>

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={() => router.push('/settings/delete-account')}
          activeOpacity={0.6}
        >
          <Text style={[styles.deleteAccountText, { color: colors.danger }]}>
            Delete my account
          </Text>
        </TouchableOpacity>
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
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
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
    fontFamily: 'DMSans_700Bold',
    marginBottom: 24,
    marginTop: 8,
  },
  
  // Editable Section
  editableSection: {
    marginBottom: 16,
  },
  
  // Editable Row
  editableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  editableRowLeft: {
    flex: 1,
  },
  editableLabel: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginBottom: 4,
  },
  editableValue: {
    fontSize: 17,
    fontFamily: 'DMSans_500Medium',
  },
  editButton: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    textDecorationLine: 'underline',
    marginTop: 20,
  },
  
  // Inline Input
  inlineInput: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 4,
  },
  passwordInput: {
    marginTop: 10,
  },
  inlineButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  inlineButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
  },
  saveButtonContainer: {
    minWidth: 70,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#FFF',
  },
  
  // Delete Account Button
  deleteAccountButton: {
    marginTop: 40,
    alignItems: 'center',
    paddingVertical: 16,
  },
  deleteAccountText: {
    fontSize: 17,
    fontFamily: 'DMSans_500Medium',
  },
});
