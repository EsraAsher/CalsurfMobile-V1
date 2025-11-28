// src/screens/OnboardingScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  Dimensions, Alert, KeyboardAvoidingView, Platform, ScrollView, Keyboard, TouchableWithoutFeedback,
  ActivityIndicator // 👈 ADDED THIS
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInRight, FadeOutLeft, ZoomIn, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// --- NEW PALETTE ---
const COLORS = {
  bg: '#131313',
  neon: '#D2FF52', // Lime Accent
  primary: '#1C46F5', // Blue
  surface: '#1E1E1E',
  text: '#F7F7F7',
  textMuted: '#888888'
};

const FONTS = {
  heading: 'Montserrat_700Bold',
  sub: 'Poppins_600SemiBold',
  body: 'Inter_400Regular',
};

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  
  // User Data State
  const [userData, setUserData] = useState({
    name: '',
    gender: '',
    height: '', // in cm
    weight: '', // in kg
    age: '',
    unit: 'metric', 
    goal: '', 
    calories: 2000, 
    diet: '',
    email: '',
    password: ''
  });

  // --- CALORIE CALCULATOR ---
  const calculateCalories = () => {
    const w = parseFloat(userData.weight);
    const h = parseFloat(userData.height);
    const a = parseFloat(userData.age) || 25;
    let bmr = 10 * w + 6.25 * h - 5 * a;
    
    if (userData.gender === 'Male') bmr += 5;
    else bmr -= 161;

    let tdee = bmr * 1.35; 

    if (userData.goal === 'lose') tdee -= 500;
    if (userData.goal === 'gain') tdee += 300;

    return Math.round(tdee);
  };

  // --- NAVIGATION ---
  const nextStep = () => {
    if (step === 3) {
        const cals = calculateCalories();
        setUserData(prev => ({ ...prev, calories: cals }));
    }
    if (step === 6) {
        setTimeout(() => setStep(8), 3000); 
        setStep(7);
        return;
    }
    setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  const updateData = (key: string, value: any) => {
    setUserData(prev => ({ ...prev, [key]: value }));
  };

  // --- AUTH HANDLER ---
  const handleSignUp = async () => {
    if(!userData.email || !userData.password) {
        Alert.alert("Error", "Please enter email and password");
        return;
    }
    try {
        const cred = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        await updateProfile(cred.user, { displayName: userData.name });
        
        await setDoc(doc(db, "users", cred.user.uid), {
            ...userData,
            uid: cred.user.uid,
            createdAt: new Date().toISOString()
        });
    } catch (e: any) {
        Alert.alert("Signup Failed", e.message);
    }
  };

  // --- RENDER STEPS ---

  const renderWelcome = () => (
    <Animated.View entering={FadeIn} exiting={FadeOutLeft} style={styles.stepContent}>
        <View style={styles.blob} />
        <Text style={styles.bigHeading}>CAL<Text style={{color: COLORS.neon}}>SURF</Text></Text>
        <Text style={styles.subtitle}>The future of body engineering.</Text>
        
        <View style={{flex: 1}} />
        
        <TouchableOpacity style={styles.neonButton} onPress={() => setStep(1)}>
            <Text style={styles.neonButtonText}>GET STARTED</Text>
            <Feather name="arrow-right" size={20} color="#000" />
        </TouchableOpacity>
        
        <TouchableOpacity 
            style={styles.textButton} 
            onPress={() => router.push('/auth')}
        >
            <Text style={styles.textButtonText}>Login if already a user</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderGender = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
        <Text style={styles.heading}>First things first.</Text>
        <Text style={styles.subText}>To calculate your metabolic rate.</Text>
        
        <View style={styles.centerContent}>
            {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity 
                    key={g} 
                    style={[styles.optionCard, userData.gender === g && styles.optionCardActive]}
                    onPress={() => updateData('gender', g)}
                >
                    <Text style={[styles.optionText, userData.gender === g && {color: '#000'}]}>{g}</Text>
                </TouchableOpacity>
            ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep} disabled={!userData.gender}>
            <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderBody = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
        <Text style={styles.heading}>Your Stats.</Text>
        <Text style={styles.subText}>We use this for science.</Text>

        <View style={styles.centerContent}>
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput 
                    style={styles.bigInput} 
                    placeholder="175" 
                    placeholderTextColor="#333"
                    keyboardType="numeric"
                    value={userData.height}
                    onChangeText={t => updateData('height', t)}
                />
            </View>
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput 
                    style={styles.bigInput} 
                    placeholder="70" 
                    placeholderTextColor="#333"
                    keyboardType="numeric"
                    value={userData.weight}
                    onChangeText={t => updateData('weight', t)}
                />
            </View>
            <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Age</Text>
                <TextInput 
                    style={styles.bigInput} 
                    placeholder="25" 
                    placeholderTextColor="#333"
                    keyboardType="numeric"
                    value={userData.age}
                    onChangeText={t => updateData('age', t)}
                />
            </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep} disabled={!userData.height || !userData.weight}>
            <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderGoal = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
        <Text style={styles.heading}>The Mission.</Text>
        
        <View style={styles.centerContent}>
            {[
                {id: 'lose', label: 'Lose Weight', icon: 'trending-down'},
                {id: 'maintain', label: 'Maintain', icon: 'minus'},
                {id: 'gain', label: 'Gain Muscle', icon: 'trending-up'}
            ].map((g) => (
                <TouchableOpacity 
                    key={g.id} 
                    style={[styles.optionCard, userData.goal === g.id && styles.optionCardActive]}
                    onPress={() => updateData('goal', g.id)}
                >
                    <Feather name={g.icon as any} size={24} color={userData.goal === g.id ? '#000' : COLORS.neon} style={{marginBottom: 10}} />
                    <Text style={[styles.optionText, userData.goal === g.id && {color: '#000'}]}>{g.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep} disabled={!userData.goal}>
            <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderCalories = () => (
    <Animated.View entering={ZoomIn} exiting={FadeOutLeft} style={styles.stepContent}>
        <Text style={styles.heading}>Your Fuel.</Text>
        <View style={styles.centerContent}>
            <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>RECOMMENDED</Text>
                <Text style={styles.resultValue}>{userData.calories}</Text>
                <Text style={styles.resultUnit}>kcal / day</Text>
            </View>
            <Text style={styles.hintText}>You can adjust this manually in settings later.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
            <Text style={styles.primaryButtonText}>Accept Plan</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderDiet = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
        <Text style={styles.heading}>Diet Style.</Text>
        
        <View style={styles.centerContent}>
            {['Classic', 'Vegetarian', 'Vegan', 'Pescatarian'].map((d) => (
                <TouchableOpacity 
                    key={d} 
                    style={[styles.rowOption, userData.diet === d && styles.rowOptionActive]}
                    onPress={() => updateData('diet', d)}
                >
                    <Text style={[styles.rowText, userData.diet === d && {color: '#000'}]}>{d}</Text>
                    {userData.diet === d && <Feather name="check" size={20} color="#000" />}
                </TouchableOpacity>
            ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={nextStep} disabled={!userData.diet}>
            <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderPrivacy = () => (
    <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContent}>
        
        <Text style={styles.heading}>Secure Data.</Text>
        <Text style={styles.paragraph}>
           Your data is secure, encrypted, and absolutely not for sale. We’re an app, not a shady ex.
        </Text>
        
        <View style={{flex: 1}} />
        <TouchableOpacity style={styles.neonButton} onPress={nextStep}>
            <Text style={styles.neonButtonText}>I AGREE</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  const renderLoading = () => (
    <View style={[styles.stepContent, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={COLORS.neon} />
        <Text style={[styles.subText, {marginTop: 20}]}>Finalizing your plan...</Text>
    </View>
  );

  const renderAuth = () => (
    <Animated.View entering={FadeInRight} style={styles.stepContent}>
        <Text style={styles.heading}>Save Profile.</Text>
        <Text style={styles.subText}>Create an account to sync your plan.</Text>

        <View style={styles.centerContent}>
            <TextInput 
                style={styles.authInput} 
                placeholder="Full Name" 
                placeholderTextColor="#555"
                value={userData.name}
                onChangeText={t => updateData('name', t)}
            />
            <TextInput 
                style={styles.authInput} 
                placeholder="Email" 
                placeholderTextColor="#555"
                autoCapitalize="none"
                value={userData.email}
                onChangeText={t => updateData('email', t)}
            />
            <View style={styles.passwordInputWrapper}>
                <TextInput 
                    style={[styles.authInput, styles.passwordInput]} 
                    placeholder="Password" 
                    placeholderTextColor="#555"
                    secureTextEntry={!showPassword}
                    value={userData.password}
                    onChangeText={t => updateData('password', t)}
                />
                <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                >
                    <Feather 
                        name={showPassword ? 'eye' : 'eye-off'} 
                        size={20} 
                        color={COLORS.neon} 
                    />
                </TouchableOpacity>
            </View>
        </View>

        <TouchableOpacity style={styles.neonButton} onPress={handleSignUp}>
            <Text style={styles.neonButtonText}>CREATE ACCOUNT</Text>
        </TouchableOpacity>
    </Animated.View>
  );

  // --- MAIN LAYOUT (KEYBOARD HANDLING) ---
  return (
    <SafeAreaView style={styles.container}>
        {/* KeyboardAvoidingView pushes content up */}
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={{ flex: 1 }}
        >
            {/* ScrollView enables scrolling if pushed off screen */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView 
                    contentContainerStyle={{ flexGrow: 1 }} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.innerContainer}>
                        {/* Back Button */}
                        {step > 0 && step < 7 && (
                            <TouchableOpacity onPress={prevStep} style={styles.backButton}>
                                <Feather name="arrow-left" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        )}

                        {/* Steps */}
                        {step === 0 && renderWelcome()}
                        {step === 1 && renderGender()}
                        {step === 2 && renderBody()}
                        {step === 3 && renderGoal()}
                        {step === 4 && renderCalories()}
                        {step === 5 && renderDiet()}
                        {step === 6 && renderPrivacy()}
                        {step === 7 && renderLoading()}
                        {step === 8 && renderAuth()}
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  innerContainer: { flex: 1, padding: 24 },
  stepContent: { flex: 1 }, // Ensures step takes full available space
  
  centerContent: { flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 20 },
  
  backButton: { position: 'absolute', top: 0, left: 0, zIndex: 10, padding: 10 },

  // Typography
  bigHeading: { fontFamily: FONTS.heading, fontSize: 48, color: COLORS.text, letterSpacing: -1, marginTop: 60 },
  heading: { fontFamily: FONTS.heading, fontSize: 32, color: COLORS.text, marginTop: 40 },
  subtitle: { fontFamily: FONTS.body, fontSize: 18, color: COLORS.textMuted, marginTop: 10 },
  subText: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.textMuted, marginTop: 8 },
  paragraph: { fontFamily: FONTS.body, fontSize: 16, color: COLORS.textMuted, lineHeight: 24, marginTop: 20 },
  
  // Buttons
  neonButton: { 
    backgroundColor: COLORS.neon, borderRadius: 30, height: 60, 
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    shadowColor: COLORS.neon, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.5, shadowRadius: 15, elevation: 5,
    marginBottom: 20
  },
  neonButtonText: { fontFamily: FONTS.sub, fontSize: 16, color: '#000' },
  
  textButton: { alignItems: 'center', padding: 10 },
  textButtonText: { fontFamily: FONTS.body, color: COLORS.textMuted },

  primaryButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  primaryButtonText: { fontFamily: FONTS.sub, color: '#FFF', fontSize: 16 },

  // Inputs & Cards
  optionCard: { 
    borderWidth: 1, borderColor: '#333', borderRadius: 16, padding: 20, alignItems: 'center',
    backgroundColor: '#1A1A1A'
  },
  optionCardActive: { backgroundColor: COLORS.neon, borderColor: COLORS.neon },
  optionText: { fontFamily: FONTS.sub, fontSize: 18, color: '#FFF' },

  rowOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#333', backgroundColor: '#1A1A1A'
  },
  rowOptionActive: { backgroundColor: COLORS.neon, borderColor: COLORS.neon },
  rowText: { fontFamily: FONTS.sub, fontSize: 16, color: '#FFF' },

  inputWrapper: { width: '100%' },
  inputLabel: { color: COLORS.textMuted, marginBottom: 5, fontSize: 12, fontFamily: FONTS.sub },
  bigInput: {
    fontSize: 24, color: '#FFF', borderBottomWidth: 2, borderBottomColor: '#333',
    paddingVertical: 10, fontFamily: FONTS.heading, marginBottom: 10
  },
  
  authInput: {
    backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, color: '#FFF',
    fontFamily: FONTS.body, fontSize: 16, borderWidth: 1, borderColor: '#333'
  },

  passwordInput: {
    paddingRight: 50,
  },

  passwordInputWrapper: {
    position: 'relative',
    width: '100%',
  },

  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    padding: 10,
    zIndex: 10,
  },

  // Result
  resultCard: {
    backgroundColor: '#1A1A1A', padding: 40, borderRadius: 30, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary, shadowColor: COLORS.primary,
    shadowOffset: {width:0, height:0}, shadowOpacity: 0.3, shadowRadius: 20
  },
  resultLabel: { color: COLORS.textMuted, fontFamily: FONTS.sub, fontSize: 14, letterSpacing: 2 },
  resultValue: { color: '#FFF', fontFamily: FONTS.heading, fontSize: 64 },
  resultUnit: { color: COLORS.text, fontFamily: FONTS.body, fontSize: 18 },
  hintText: { textAlign: 'center', color: '#555', marginTop: 20, fontSize: 12 },

  // Decor
  blob: {
    position: 'absolute', top: -100, right: -100, width: 300, height: 300,
    backgroundColor: COLORS.primary, borderRadius: 150, opacity: 0.2
  }
});