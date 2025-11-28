// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// --- MATCHING PALETTE ---
const COLORS = {
  bg: '#131313',
  neon: '#D2FF52', // Lime Accent
  surface: '#1A1A1A', // Input background
  border: '#333333',
  text: '#F7F7F7',
  textMuted: '#888888',
  danger: '#FF453A'
};

const FONTS = {
  heading: 'Montserrat_700Bold',
  sub: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
};

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleToggleMode = () => {
    if (isLogin) {
      // User wants to sign up - go to onboarding
      router.push('/onboarding');
    } else {
      // User wants to login - toggle back to login mode
      setIsLogin(true);
    }
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Missing Info", "Please fill in all fields.");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign Up Flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email: email,
          photoURL: null,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      let msg = "An unexpected error occurred.";
      if (error.code === 'auth/invalid-email') msg = 'Invalid email address.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      if (error.code === 'auth/wrong-password') msg = 'Invalid email or password.';
      if (error.code === 'auth/email-already-in-use') msg = 'This email is already registered.';
      if (error.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';
      Alert.alert("Authentication Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Enter your email first, then tap Forgot Password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Check your inbox for a reset link!");
    } catch (error: any) {
        Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      {/* BACKGROUND BLOB (Matches Welcome Screen) */}
      <View style={styles.blob} />

      <View style={styles.content}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLogin ? "Welcome Back." : "Join the Club."}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin ? "Let's crush some goals today." : "Start your fitness journey now."}
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          
          {!isLogin && (
            <View style={styles.inputContainer}>
                <Feather name="user" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={COLORS.textMuted}
                    value={name}
                    onChangeText={setName}
                />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                <Text style={{ color: COLORS.textMuted, fontFamily: FONTS.body, fontSize: 14 }}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* NEON BUTTON */}
          <TouchableOpacity 
            onPress={handleAuth} 
            disabled={loading} 
            activeOpacity={0.8}
            style={styles.neonButton}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.neonButtonText}>
                {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* TOGGLE */}
        <TouchableOpacity onPress={handleToggleMode} style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? "New here? " : "Already have an account? "}
            <Text style={styles.link}>{isLogin ? "Create Account" : "Sign In"}</Text>
          </Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
  },
  blob: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    backgroundColor: '#1C46F5', // Blue glow matching Onboarding
    borderRadius: 200,
    opacity: 0.15,
    transform: [{ scale: 1.2 }],
    // Note: React Native 'filter' prop is not standard on all versions, 
    // but opacity + large size creates a similar diffuse look.
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 40, // Big Bold like Onboarding
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: FONTS.body,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16, // Matching rounded corners
    paddingHorizontal: 16,
    height: 60, // Taller inputs
  },
  inputIcon: {
    marginRight: 16,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.body,
    fontSize: 16,
    height: '100%',
  },
  neonButton: {
    height: 60,
    borderRadius: 30, // Pill shape
    backgroundColor: COLORS.neon,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  neonButtonText: {
    color: '#000', // Black text on Neon
    fontFamily: FONTS.sub,
    fontSize: 16,
    letterSpacing: 1,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.body,
    fontSize: 14,
  },
  link: {
    color: COLORS.text, // White text for link to stand out
    fontFamily: FONTS.sub,
  },
});