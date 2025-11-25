// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Image, Alert, 
  ScrollView, TextInput, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile, updateEmail, signOut } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { COLORS, SPACING, RADIUS } from '../theme';

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  // State
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load Avatar
  React.useEffect(() => {
    const fetchProfile = async () => {
        if (user) {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setAvatar(docSnap.data().photoURL);
            }
        }
    };
    fetchProfile();
  }, [user]);

  // --- FIXED IMAGE PICKER ---
  const pickImage = async () => {
    if (!isEditing) {
        Alert.alert("Edit Mode", "Please tap 'Edit' in the top right to change your photo.");
        return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need access to your photos.');
      return;
    }

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
      } catch (e: any) {
          console.error("Error saving photo", e);
          Alert.alert("Upload Error", e.message);
      }
    }
  };

  // Save
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
        if (name !== user.displayName) {
            await updateProfile(user, { displayName: name });
            await updateDoc(doc(db, "users", user.uid), { displayName: name });
        }

        if (email !== user.email) {
            await updateEmail(user, email);
            await updateDoc(doc(db, "users", user.uid), { email: email });
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

  const handleLogout = async () => {
      try { await signOut(auth); } catch (e) { console.error(e); }
  };

  const renderAvatar = () => {
      if (avatar) {
          return <Image source={{ uri: avatar }} style={styles.avatarImage} />;
      }
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={isEditing ? handleSave : () => setIsEditing(true)} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.editButton}>{isEditing ? 'Done' : 'Edit'}</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickImage} activeOpacity={isEditing ? 0.7 : 1} style={styles.avatarContainer}>
                {renderAvatar()}
                {isEditing && (
                    <View style={styles.cameraIcon}><Feather name="camera" size={14} color="#FFF" /></View>
                )}
            </TouchableOpacity>
            
            <View style={styles.infoContainer}>
                {isEditing ? (
                    <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={COLORS.textMuted} autoFocus />
                ) : (
                    <Text style={styles.userName}>{name || "User"}</Text>
                )}
                <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
        </View>

        <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Support", "FAQ Page coming soon.")}>
                <View style={styles.menuIconBox}><Feather name="help-circle" size={20} color="#FFF" /></View>
                <Text style={styles.menuText}>Help & Support</Text>
                <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Settings", "Preferences coming soon.")}>
                <View style={styles.menuIconBox}><Feather name="settings" size={20} color="#FFF" /></View>
                <Text style={styles.menuText}>Preferences</Text>
                <Feather name="chevron-right" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color={COLORS.danger} style={{marginRight: 8}} />
            <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
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
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl * 1.5 },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: '#FFF' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
  avatarInitial: { fontSize: 32, fontWeight: 'bold', color: '#000' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 15, borderWidth: 2, borderColor: '#000' },
  infoContainer: { marginLeft: SPACING.m, flex: 1 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
  nameInput: { fontSize: 24, fontWeight: 'bold', color: '#FFF', borderBottomWidth: 1, borderBottomColor: COLORS.primary, paddingBottom: 2, marginBottom: 4 },
  userEmail: { fontSize: 14, color: COLORS.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: SPACING.s, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  menuSection: { backgroundColor: '#1C1C1E', borderRadius: RADIUS.m, overflow: 'hidden', marginBottom: SPACING.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  menuIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  menuText: { flex: 1, fontSize: 16, color: '#FFF', fontWeight: '500' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.m, backgroundColor: '#1C1C1E', borderRadius: RADIUS.m, marginBottom: SPACING.l },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' },
  versionText: { textAlign: 'center', color: '#333', fontSize: 12 }
});
