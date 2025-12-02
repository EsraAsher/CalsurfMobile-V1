// app/settings/security.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { sendPasswordResetEmail, updateEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../.vscode/src/config/firebase';
import { useTheme } from '../../.vscode/src/context/ThemeContext';

export default function SecurityScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { colors } = useTheme();
  
  const [email, setEmail] = useState(user?.email || '');

  const handleChangePassword = async () => {
    if (user?.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        Alert.alert('Email Sent', 'Check your inbox to reset your password.');
      } catch (e: any) {
        Alert.alert('Error', e.message);
      }
    }
  };

  const handleUpdateEmail = async () => {
    if (email === user?.email) {
      Alert.alert('No Changes', 'Email is already up to date.');
      return;
    }
    
    try {
      if (user) {
        await updateEmail(user, email);
        await updateDoc(doc(db, 'users', user.uid), { email });
        Alert.alert('Success', 'Email updated successfully');
      }
    } catch (e: any) {
      Alert.alert('Security', 'For security, please Log Out and Log In again to change your email.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Security & Login</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Email Address</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleUpdateEmail}
        >
          <Text style={styles.actionButtonText}>Update Email</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={handleChangePassword}
        >
          <Feather name="lock" size={20} color={colors.textPrimary} style={{ marginRight: 12 }} />
          <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>Change Password</Text>
        </TouchableOpacity>

        <Text style={[styles.helpText, { color: colors.textMuted }]}>
          A password reset link will be sent to your email address.
        </Text>
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
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  inputContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    paddingVertical: 4,
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 32,
  },
  helpText: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
