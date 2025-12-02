// app/settings/delete-account.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../.vscode/src/config/firebase';
import { THEMES } from '../../.vscode/src/theme';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const colors = THEMES.light; // Always use light mode
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (!user || !user.email) return;
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      // Re-authenticate user before deleting
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      
      // Delete Firestore data
      await deleteDoc(doc(db, 'users', user.uid));
      // Delete auth account
      await deleteUser(user);
      
      Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
    } catch (e: any) {
      console.error('Error deleting account:', e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please try again.');
      } else {
        setError('Failed to delete account. Please try again.');
      }
    }
    setDeleting(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Delete Account</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.warningText, { color: colors.textPrimary }]}>
          Deleting your account is permanent and cannot be undone. All your data, including health goals, food logs, personal information, and settings will be permanently deleted from our servers.
        </Text>

        <Animated.View layout={Layout.springify()}>
          {!showConfirmation ? (
            <Animated.View exiting={FadeOut.duration(200)}>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.danger }]}
                onPress={() => setShowConfirmation(true)}
              >
                <Text style={styles.deleteButtonText}>Delete My Account</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View 
              entering={FadeIn.duration(200)} 
              style={[styles.confirmationContainer, { borderColor: colors.border }]}
            >
              <Text style={[styles.confirmLabel, { color: colors.textPrimary }]}>
                Enter your password to confirm
              </Text>
              <TextInput
                style={[
                  styles.passwordInput, 
                  { 
                    backgroundColor: colors.inputBg, 
                    color: colors.textPrimary,
                    borderColor: error ? colors.danger : colors.border,
                  }
                ]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setError('');
                }}
                autoFocus
              />
              {error ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              ) : null}
              
              <TouchableOpacity
                style={[styles.confirmDeleteButton, { backgroundColor: colors.danger }]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.inlineCancelButton} 
                onPress={() => {
                  setShowConfirmation(false);
                  setPassword('');
                  setError('');
                }}
              >
                <Text style={[styles.inlineCancelText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {!showConfirmation && (
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={[styles.cancelButtonText, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { 
    fontSize: 18, 
    fontFamily: 'DMSans_600SemiBold',
  },
  content: { 
    paddingHorizontal: 20, 
    paddingTop: 20,
  },
  warningText: {
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 24,
    marginBottom: 32,
  },
  deleteButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  cancelButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
  },
  
  // Confirmation form styles
  confirmationContainer: {
    marginTop: 8,
  },
  confirmLabel: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 12,
  },
  passwordInput: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'DMSans_400Regular',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    marginTop: 8,
  },
  confirmDeleteButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  inlineCancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  inlineCancelText: {
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
  },
});
