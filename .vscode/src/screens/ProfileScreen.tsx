// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
  ScrollView, TextInput, ActivityIndicator, Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, updateEmail, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../config/firebase';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  // --- STATE ---
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // Health Goals
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

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
                    // Load Health Goals
                    if (data.calories) setCalories(data.calories.toString());
                    if (data.protein) setProtein(data.protein.toString());
                }
            } catch (e) {
                console.log("Error fetching profile:", e);
            }
        }
    };
    fetchProfile();
  }, [user]);

  // --- 2. ACTIONS ---
  
  const pickImage = async () => {
    if (!isEditing) {
        Alert.alert("Edit Mode", "Please tap 'Edit' in the top right to change your photo.");
        return;
    }
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
        if (auth.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: base64Img });
        }
      } catch (e: any) { console.error("Error saving photo", e); }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
        const updates: any = {};
        const authUpdates = [];

        // 1. Update Auth Profile
        if (name !== user.displayName) {
            authUpdates.push(updateProfile(user, { displayName: name }));
            updates.displayName = name;
        }
        if (email !== user.email) {
            authUpdates.push(updateEmail(user, email));
            updates.email = email;
        }

        // 2. Update Firestore (Health Data)
        updates.calories = parseInt(calories) || 2000;
        updates.protein = parseInt(protein) || 150;

        await Promise.all(authUpdates);
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, "users", user.uid), updates);
        }

        setIsEditing(false);
        Alert.alert("Success", "Profile updated!");

    } catch (e: any) {
        if (e.message.includes('requires-recent-login')) {
            Alert.alert("Security", "Please log out and log back in to change Email.");
        } else {
            Alert.alert("Error", e.message);
        }
    } finally {
        setLoading(false);
    }
  };

  const handleChangePassword = async () => {
      if (user?.email) {
          try {
              await sendPasswordResetEmail(auth, user.email);
              Alert.alert("Email Sent", "Check your inbox to reset your password.");
          } catch (e: any) {
              Alert.alert("Error", e.message);
          }
      }
  };

  const handleLogout = async () => {
      try {
        await signOut(auth);
        await AsyncStorage.clear();
      } catch (e) { console.error(e); }
  };

  const renderAvatar = () => {
      if (avatar) return <Image source={{ uri: avatar }} style={styles.avatarImage} />;
      return (
          <View style={[styles.avatarPlaceholder, { backgroundColor: COLORS.success }]}>
              <Text style={styles.avatarInitial}>{name ? name[0].toUpperCase() : 'U'}</Text>
          </View>
      );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={isEditing ? handleSave : () => setIsEditing(true)} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.editButton}>{isEditing ? 'Done' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* AVATAR SECTION */}
        <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage} activeOpacity={isEditing ? 0.7 : 1} style={styles.avatarContainer}>
                {renderAvatar()}
                {isEditing && <View style={styles.cameraIcon}><Feather name="camera" size={14} color="#FFF" /></View>}
            </TouchableOpacity>
            <View style={styles.infoContainer}>
                {isEditing ? (
                    <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={COLORS.textMuted} />
                ) : (
                    <Text style={styles.userName}>{name || "User"}</Text>
                )}
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
        </View>

        {/* 1. HEALTH GOALS */}
        <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Health Goals</Text>
            
            <View style={styles.menuItem}>
                <View style={styles.menuIconBox}>
                    <Feather name="activity" size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.menuText}>Daily Calories</Text>
                {isEditing ? (
                    <TextInput 
                        style={styles.valueInput} 
                        value={calories} 
                        onChangeText={setCalories} 
                        keyboardType="numeric" 
                        placeholder="2000"
                        placeholderTextColor={COLORS.textMuted}
                    />
                ) : (
                    <Text style={styles.rowValue}>{calories} kcal</Text>
                )}
            </View>

            <View style={[styles.menuItem, { borderBottomWidth: 0 }]}>
                <View style={styles.menuIconBox}>
                    <Feather name="zap" size={18} color={COLORS.secondary} />
                </View>
                <Text style={styles.menuText}>Protein Target</Text>
                {isEditing ? (
                    <TextInput 
                        style={styles.valueInput} 
                        value={protein} 
                        onChangeText={setProtein} 
                        keyboardType="numeric" 
                        placeholder="150"
                        placeholderTextColor={COLORS.textMuted}
                    />
                ) : (
                    <Text style={styles.rowValue}>{protein} g</Text>
                )}
            </View>
        </View>

        {/* 2. ACCOUNT SETTINGS */}
        <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <View style={styles.menuItem}>
                <View style={styles.menuIconBox}><Feather name="mail" size={18} color="#FFF" /></View>
                <Text style={styles.menuText}>Email</Text>
                {isEditing ? (
                    <TextInput 
                        style={[styles.valueInput, { width: 200, textAlign: 'right', fontSize: 14 }]} 
                        value={email} 
                        onChangeText={setEmail} 
                        keyboardType="email-address" 
                        autoCapitalize="none"
                    />
                ) : (
                    <Text style={[styles.rowValue, { fontSize: 14 }]}>{email}</Text>
                )}
            </View>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleChangePassword}>
                <View style={styles.menuIconBox}><Feather name="lock" size={18} color="#FFF" /></View>
                <Text style={styles.menuText}>Change Password</Text>
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
        </View>

        {/* 3. PREFERENCES (Updated with Reminders) */}
        <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => router.push('/reminders')}>
                <View style={styles.menuIconBox}>
                    <Feather name="bell" size={18} color="#FFF" />
                </View>
                <Text style={styles.menuText}>Reminders & Alarms</Text>
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
        </View>

        {/* 4. SUPPORT */}
        <View style={styles.menuSection}>
    <Text style={styles.sectionTitle}>Support</Text>
       <TouchableOpacity 
        style={[styles.menuItem, { borderBottomWidth: 0 }]} 
        onPress={() => router.push('/support')}   // 👈 Updated navigation
          >
        <View style={styles.menuIconBox}>
            <Feather name="help-circle" size={18} color="#FFF" />
        </View>

        <Text style={styles.menuText}>FAQ & Support</Text>
        <Feather name="external-link" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
        </View>


        {/* LOGOUT */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>CalSurf v1.0.0</Text>
        <View style={{height: 40}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFF' },
  editButton: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
  content: { padding: SPACING.l },
  
  // Profile Header
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#FFF' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  avatarInitial: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 15, borderWidth: 2, borderColor: '#000' },
  infoContainer: { marginLeft: SPACING.m, flex: 1 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  nameInput: { fontSize: 24, fontWeight: 'bold', color: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingBottom: 2 },
  userEmail: { fontSize: 14, color: COLORS.textMuted, marginTop: 4 },

  // MENU STYLES (Fixed missing props)
  menuSection: { backgroundColor: '#1C1C1E', borderRadius: RADIUS.m, marginBottom: SPACING.l, overflow: 'hidden' },
  sectionTitle: { fontSize: 13, color: COLORS.textMuted, marginTop: SPACING.m, marginLeft: SPACING.m, marginBottom: SPACING.s, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  menuIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { flex: 1, fontSize: 16, color: '#FFF', fontWeight: '500' },
  
  rowValue: { fontSize: 16, color: COLORS.textMuted },
  valueInput: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold', textAlign: 'right', minWidth: 60, borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingBottom: 2 },

  logoutButton: { alignItems: 'center', padding: 16, marginTop: SPACING.s },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' },
  versionText: { textAlign: 'center', color: '#333', fontSize: 12, marginBottom: 20 }
});