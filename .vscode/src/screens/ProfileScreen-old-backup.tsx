// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
  ScrollView, TextInput, ActivityIndicator, Platform, UIManager, LayoutAnimation
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, updateEmail, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { auth, db } from '../config/firebase';
import { THEMES } from '../theme';
import { useTheme } from '../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- COMPONENT: EDITABLE ROW ---
// Handles individual field editing (The "Separate Logic" you requested)
const EditableRow = ({ label, value, icon, isNumeric, onSave, colors, isLast }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);

  // Sync internal state if prop changes
  useEffect(() => {
    if (!isEditing) setText(value);
  }, [value]);

  const handleSave = async () => {
    if (text === value) {
        setIsEditing(false);
        return;
    }
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setText(value);
    setIsEditing(false);
  };

  return (
    <View style={[styles.rowItem, { borderBottomColor: colors.border, borderBottomWidth: isLast ? 0 : 1 }]}>
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                {label.includes('Calories') ? (
                    <MaterialCommunityIcons name="food-outline" size={18} color={colors.primary} />
                ) : label.includes('Protein') ? (
                    <MaterialCommunityIcons name="egg" size={18} color={colors.primary} />
                ) : (
                    <Feather name={icon} size={18} color={colors.textPrimary} />
                )}
            </View>
            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        </View>

        <View style={styles.rowRight}>
            {isEditing ? (
                <View style={styles.editingContainer}>
                    <TextInput 
                        style={[styles.valueInput, { color: colors.primary }]} 
                        value={text} 
                        onChangeText={setText} 
                        keyboardType={isNumeric ? 'numeric' : 'default'}
                        autoFocus
                        autoCorrect={false}
                        spellCheck={false}
                        underlineColorAndroid="transparent"
                    />
                    <View style={styles.editingActions}>
                        <TouchableOpacity onPress={handleCancel}>
                            <Feather name="x" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="check" size={20} color={colors.success} />}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <Text style={[styles.rowValue, { color: colors.textMuted }]} numberOfLines={1}>
                        {value} {isNumeric && (label.includes('Calories') ? 'kcal' : 'g')}
                    </Text>
                    <TouchableOpacity onPress={() => setIsEditing(true)} style={{marginLeft: 10}}>
                        <Feather name="edit-2" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                </>
            )}
        </View>
    </View>
  );
};

// --- COMPONENT: ACCORDION ---
const Accordion = ({ title, icon, isOpen, onToggle, children, colors }: any) => (
  <View style={[styles.accordionContainer, { backgroundColor: colors.card }]}>
    <TouchableOpacity 
      style={[styles.accordionHeader, { borderBottomWidth: isOpen ? 1 : 0, borderBottomColor: colors.border }]} 
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.accordionLeft}>
          <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      <Feather name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
    </TouchableOpacity>
    {isOpen && <View style={styles.accordionContent}>{children}</View>}
  </View>
);

// --- MAIN SCREEN ---
export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { mode, colors, setMode } = useTheme(); 
  
  // State
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');

  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpenSection(openSection === section ? null : section);
  };

  // --- 1. LOAD DATA ---
  useEffect(() => {
    const fetchProfile = async () => {
        if (user) {
            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAvatar(data.photoURL);
                    if (data.displayName) setName(data.displayName);
                    if (data.calories) setCalories(data.calories.toString());
                    if (data.protein) setProtein(data.protein.toString());
                }
            } catch (e) { console.log("Error fetching profile:", e); }
        }
    };
    fetchProfile();
  }, [user]);

  // --- 2. INDIVIDUAL UPDATE HANDLERS ---
  
  const updateName = async (newVal: string) => {
      try {
          if(user) {
              await updateProfile(user, { displayName: newVal });
              await updateDoc(doc(db, "users", user.uid), { displayName: newVal });
              setName(newVal);
          }
      } catch(e:any) { Alert.alert("Error", e.message); }
  };

  const updateEmailAddr = async (newVal: string) => {
      try {
          if(user) {
              await updateEmail(user, newVal);
              await updateDoc(doc(db, "users", user.uid), { email: newVal });
              setEmail(newVal);
          }
      } catch(e:any) { 
          Alert.alert("Security", "For security, please Log Out and Log In again to change your email."); 
      }
  };

  const updateCalories = async (newVal: string) => {
      try {
        if(user) {
            await updateDoc(doc(db, "users", user.uid), { calories: parseInt(newVal) });
            setCalories(newVal);
        }
      } catch(e:any) { Alert.alert("Error", e.message); }
  };

  const updateProtein = async (newVal: string) => {
      try {
        if(user) {
            await updateDoc(doc(db, "users", user.uid), { protein: parseInt(newVal) });
            setProtein(newVal);
        }
      } catch(e:any) { Alert.alert("Error", e.message); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, aspect: [1, 1], quality: 0.2, base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64Img); 
      try {
        if (user) await updateDoc(doc(db, "users", user.uid), { photoURL: base64Img });
      } catch (e) { console.error(e); }
    }
  };

  const handleChangePassword = async () => {
      if (user?.email) {
          try {
              await sendPasswordResetEmail(auth, user.email);
              Alert.alert("Email Sent", "Check your inbox to reset your password.");
          } catch (e: any) { Alert.alert("Error", e.message); }
      }
  };

  const handleLogout = async () => {
      try { await signOut(auth); await AsyncStorage.clear(); } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* BLUE AMBIENT GLOW */}
      <LinearGradient
        colors={['rgba(0, 122, 255, 0.15)', 'transparent']}
        style={styles.ambientGlow}
        pointerEvents="none"
      />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* HERO SECTION */}
        <View style={styles.heroContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={[styles.avatarImage, { borderColor: colors.card }]} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.success, borderColor: colors.card }]}>
                        <Text style={styles.avatarInitial}>{name ? name[0].toUpperCase() : 'U'}</Text>
                    </View>
                )}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                    <Feather name="camera" size={12} color="#FFF" />
                </View>
            </TouchableOpacity>
            
            <Text style={[styles.heroName, { color: colors.textPrimary }]}>{name || "User"}</Text>
            
            {/* Reminders Section (Replaced Activity Status) */}
            <TouchableOpacity style={[styles.statusCard, { backgroundColor: colors.card, paddingVertical: 16 }]} onPress={() => router.push('/reminders')}>
                <View style={styles.statusLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="bell" size={18} color={colors.danger} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Manage Reminders</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
        </View>

        {/* 2. HEALTH TARGETS (Not in Accordion) */}

        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>HEALTH DETAILS</Text>
        <View style={[styles.accordionContainer, { backgroundColor: colors.card }]}>
            <View style={[ { borderBottomWidth: 0 }]}>
                <View style={styles.accordionLeft}>
                </View>
            </View>
            <View style={styles.accordionContent}>
                <EditableRow label="Daily Calories" value={calories} icon="food" isNumeric onSave={updateCalories} colors={colors} isLast={false} />
                <EditableRow label="Protein Target" value={protein} icon="egg" isNumeric onSave={updateProtein} colors={colors} isLast={true} />
            </View>
        </View>

        {/* 1. PERSONAL DETAILS (Merged Account & Name) */}

        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PERSONALIZE</Text>
        <Accordion 
            title="Account Details" 
            isOpen={openSection === 'personal'} 
            onToggle={() => toggleSection('personal')}
            colors={colors}
        >
            <EditableRow label="Name" value={name} icon="user" onSave={updateName} colors={colors} isLast={false} />
            <EditableRow label="Email" value={email} icon="mail" onSave={updateEmailAddr} colors={colors} isLast={false} />
            
            {/* Change Password Action */}
            <TouchableOpacity style={[styles.rowItem, { borderBottomWidth: 0 }]} onPress={handleChangePassword}>
                <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="lock" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Change Password</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
        </Accordion>


        {/* 3. APP SETTINGS */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APP SETTINGS</Text>
        <Accordion 
            title="Theme" 
            isOpen={openSection === 'theme'} 
            onToggle={() => toggleSection('theme')}
            colors={colors}
        >
            {(['light', 'dark', 'system'] as const).map((modeKey) => {
                const isSelected = mode === modeKey;
                return (
                    <TouchableOpacity 
                        key={modeKey}
                        style={[styles.rowItem, { borderBottomWidth: modeKey === 'system' ? 0 : 1, borderBottomColor: colors.border }]} 
                        onPress={() => setMode(modeKey)}
                    >
                        <View style={styles.rowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                                <Feather 
                                    name={modeKey === 'light' ? 'sun' : modeKey === 'dark' ? 'moon' : 'smartphone'} 
                                    size={18} 
                                    color={isSelected ? colors.primary : colors.textPrimary} 
                                />
                            </View>
                            <Text style={[styles.rowLabel, { color: isSelected ? colors.primary : colors.textPrimary, textTransform: 'capitalize' }]}>
                                {modeKey}
                            </Text>
                        </View>
                        {isSelected && <Feather name="check" size={18} color={colors.primary} />}
                    </TouchableOpacity>
                );
            })}
        </Accordion>

        {/* Surf AI Settings */}
        <Accordion 
            title="Surf AI Settings" 
            isOpen={openSection === 'surfai'} 
            onToggle={() => toggleSection('surfai')}
            colors={colors}
        >
            <View style={[styles.rowItem, { borderBottomWidth: 0 }]}>
                <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="settings" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Coming Soon!</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </View>
        </Accordion>

            {/* SUPPORT AND FAQ */}
            <TouchableOpacity style={[styles.statusCard, { backgroundColor: colors.card, paddingVertical: 16 }]} onPress={() => router.push('/support')}>
                <View style={styles.statusLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="moon" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>FAQ & Support</Text>
                </View>
                <Feather name="link" size={18} color={colors.textMuted} />
            </TouchableOpacity>

        {/* LEGAL */}

        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>APP SETTINGS</Text>
        <Accordion 
            title="Legal" 
            isOpen={openSection === 'legal'} 
            onToggle={() => toggleSection('legal')}
            colors={colors}
        >
            <TouchableOpacity 
                style={[styles.rowItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]} 
                onPress={() => router.push({ pathname: '/legalDoc', params: { docId: 'privacy_policy' } })}
            >
                <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="shield" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Privacy Policy</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.rowItem, { borderBottomWidth: 0 }]} 
                onPress={() => router.push({ pathname: '/legalDoc', params: { docId: 'terms_conditions' } })}
            >
                <View style={styles.rowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                        <Feather name="file-text" size={18} color={colors.textPrimary} />
                    </View>
                    <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Terms & Conditions</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </TouchableOpacity>
        </Accordion>

        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={[styles.logoutText, { color: colors.danger }]}>LOG OUT</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 350,
    zIndex: 0,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  content: { paddingHorizontal: 20 },

  // Hero
  heroContainer: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  avatarContainer: { position: 'relative', width: 100, height: 100 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: 'bold' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#000' },
  heroName: { fontSize: 28, fontWeight: 'bold', marginTop: 16, marginBottom: 16 },
  
  statusCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: 16, borderRadius: 16 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: '600' },
  statusValue: { fontSize: 14, fontWeight: 'bold' },

  sectionHeader: { fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 10, letterSpacing: 1 },

  // Accordion
  accordionContainer: { borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  accordionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accordionTitle: { fontSize: 16, fontWeight: '600' },
  accordionContent: { paddingHorizontal: 16, paddingBottom: 8 },

  // Row Item
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', display: 'flex' },
  rowLabel: { fontSize: 16, fontWeight: '500' },
  
  rowRight: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', overflow: 'hidden' },
  rowValue: { fontSize: 16, flexShrink: 1 },
  editingContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  editingActions: { flexDirection: 'row', gap: 12, marginLeft: 10 },
  valueInput: { fontSize: 16, fontWeight: 'bold', textAlign: 'right', flex: 1, paddingVertical: 0, paddingHorizontal: 4, minWidth: 60, maxWidth: 150 },

  logoutButton: { alignItems: 'center', padding: 16, marginTop: 40 },
  logoutText: { fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', padding: 24, borderRadius: 24, borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  themeOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 2 },
});