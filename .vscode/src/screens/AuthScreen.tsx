// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth, db } from '../config/firebase'; // Make sure db is exported from config
import { doc, setDoc } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState(''); // New State for Name
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Strength Checker
  const getPasswordStrengthFeedback = () => {
    if (!password || isLogin) return []; // Only show for sign-up
    
    const feedback = [];
    if (password.length < 7) feedback.push('At least 7 characters');
    if (!/[A-Z]/.test(password)) feedback.push('Add one capital letter');
    if (!/[0-9]/.test(password)) feedback.push('Include a number');
    if (!/[!@#$%^&*]/.test(password)) feedback.push('Try adding a symbol (!@#$%^&*)');
    
    return feedback;
  };

  const passwordFeedback = getPasswordStrengthFeedback();
  const isPasswordStrong = !isLogin && password.length > 0 && passwordFeedback.length === 0;

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // 1. Create User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Display Name in Auth
        await updateProfile(user, { displayName: name });

        // 3. Create User Document in Firestore (for future profile data)
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          displayName: name,
          email: email,
          photoURL: null,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes('auth/invalid-email')) msg = 'Invalid email address.';
      if (msg.includes('auth/user-not-found')) msg = 'No user found with this email.';
      if (msg.includes('auth/wrong-password')) msg = 'Wrong password. Try forgot password.';
      if (msg.includes('auth/invalid-credentials')) msg = 'Wrong password. Try forgot password.';
      if (msg.includes('auth/email-already-in-use')) msg = 'Email already in use.';
      Alert.alert("Authentication Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Sometimes it lands in spam, so be sure to check there too.!");
    } catch (error: any) {
        Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconCircle}><Feather name="activity" size={40} color="#FFF" /></View>
          <Text style={styles.title}>Thicc Log</Text>
          <Text style={styles.subtitle}>{isLogin ? "Welcome back, Legend!" : "Start your journey today."}</Text>
        </View>

        <View style={styles.form}>
          {/* NAME INPUT (Only for Sign Up) */}
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
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.textMuted} autoCapitalize="none" value={email} onChangeText={setEmail} />
          </View>

          <View style={styles.inputContainer}>
            <Feather name="lock" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.textMuted} secureTextEntry value={password} onChangeText={setPassword} />
          </View>

          {/* PASSWORD STRENGTH FEEDBACK (Only on Sign Up) */}
          {!isLogin && password.length > 0 && (
            <View style={styles.feedbackContainer}>
              {isPasswordStrong ? (
                <View style={styles.successRow}>
                  <Feather name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.successText}>Password looks great! 🎉</Text>
                </View>
              ) : (
                <View>
                  {passwordFeedback.map((msg, idx) => (
                    <View key={idx} style={styles.feedbackRow}>
                      <Feather name="alert-circle" size={14} color={COLORS.textMuted} />
                      <Text style={styles.feedbackText}>{msg}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {isLogin && (
            <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.button}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{isLogin ? "Sign In" : "Create Account"}</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.footer}>
          <Text style={styles.footerText}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Text style={styles.link}>{isLogin ? "Sign Up" : "Log In"}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },
  content: { padding: SPACING.xl },
  header: { alignItems: 'center', marginBottom: SPACING.xl * 1.5 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.cardHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.m, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FFF', marginBottom: SPACING.s },
  subtitle: { fontSize: 16, color: COLORS.textMuted },
  form: { gap: SPACING.m },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.m, paddingHorizontal: SPACING.m, height: 56 },
  inputIcon: { marginRight: SPACING.m },
  input: { flex: 1, color: '#FFF', fontSize: 16, height: '100%' },
  
  // PASSWORD STRENGTH FEEDBACK
  feedbackContainer: { marginTop: SPACING.s, paddingHorizontal: SPACING.s, paddingVertical: SPACING.s, backgroundColor: 'rgba(139, 92, 246, 0.08)', borderRadius: RADIUS.s, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s },
  successText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, marginBottom: SPACING.s },
  feedbackText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  
  button: { height: 56, borderRadius: RADIUS.m, justifyContent: 'center', alignItems: 'center', marginTop: SPACING.s },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  footer: { marginTop: SPACING.xl, alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  link: { color: COLORS.primary, fontWeight: 'bold' },
});