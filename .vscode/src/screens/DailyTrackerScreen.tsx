// src/screens/DailyTrackerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, 
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, StatusBar, 
  Keyboard, Vibration, Dimensions, Animated, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'; 
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import Storage

// --- FIREBASE IMPORTS ---
import { doc, getDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// --- CUSTOM HOOKS & API ---
import { useFoodLog } from '@/hooks/useFoodLog';
import { getAccurateCalories, getUserRegion, identifyFoodFromVoice } from '../api/gemini';
import { DailyLogItem } from '../types/data';
import { COLORS, SPACING, RADIUS } from '../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (SPACING.l * 2); 
const NEON_GREEN = '#ADFF2F';

// --- COMPONENT: FOOD CARD ---
const FoodCard = ({ title, calories, protein, isEaten, onToggle, onDelete }: any) => (
  <View style={styles.cardRow}>
    <View style={styles.cardInfo}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSubtitle}>{calories} kcal  •  {protein}g protein</Text>
    </View>
    <View style={styles.cardActions}>
        <TouchableOpacity onPress={onToggle} style={[styles.checkButton, isEaten && styles.checkButtonActive]}>
            <Feather name="check" size={16} color={isEaten ? '#FFF' : COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Feather name="trash-2" size={18} color={COLORS.danger} />
        </TouchableOpacity>
    </View>
  </View>
);

// --- MAIN SCREEN ---
export default function DailyTrackerScreen() {
  const user = auth.currentUser;
  const { logs: dailyLog, addLog, toggleEaten, deleteLog } = useFoodLog();
  const router = useRouter(); 
  const { voiceData } = useLocalSearchParams();

  const [userLocation, setUserLocation] = useState<string>('Locating...');
  const [searchText, setSearchText] = useState('');
  const [isFinding, setIsFinding] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Profile State
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Thicc User');
  const [goals, setGoals] = useState({ calories: 2000, protein: 150 });
  
  // 👇 NOTIFICATION STATE
  const [hasUnread, setHasUnread] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;

  // --- 1. CHECK FOR UPDATES ---
// --- 1. REAL-TIME NOTIFICATION LISTENER ---
  useEffect(() => {
    // Listen to the 'announcements' collection constantly
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
            const latestPost = snapshot.docs[0].data();
            const latestTime = new Date(latestPost.createdAt).getTime();
            
            // Get the time user last opened the updates page
            const lastSeen = await AsyncStorage.getItem('lastViewedUpdates');
            const seenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

            // If the post is newer than the last visit, show the dot
            if (latestTime > seenTime) {
                setHasUnread(true);
            } else {
                setHasUnread(false);
            }
        }
    });

    return () => unsubscribe();
  }, []);

  // --- 2. FETCH REAL PROFILE DATA ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.photoURL) setAvatar(data.photoURL);
            const realName = data.name || data.displayName || user.displayName;
            if (realName) setDisplayName(realName);
            if (data.calories) {
                setGoals(prev => ({ ...prev, calories: data.calories }));
            }
          } else {
            if (user.photoURL) setAvatar(user.photoURL);
            if (user.displayName) setDisplayName(user.displayName);
          }
        } catch (e) { console.log("Error fetching profile:", e); }
      }
    };
    fetchProfile();
    getUserRegion().then(setUserLocation);
  }, [user]);

  // --- HANDLE VOICE DATA ---
  useEffect(() => {
      if (voiceData) {
        try {
          const parsed = JSON.parse(voiceData as string);
          handleAddLogItem(parsed);
          router.setParams({ voiceData: '' }); 
        } catch (e) { console.error(e); }
      }
  }, [voiceData]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysLogs = dailyLog.filter((item: DailyLogItem) => item.date === todayStr);

  const totals = todaysLogs.reduce((acc: { calories: number; protein: number }, item: DailyLogItem) => {
    if (item.isEaten) {
      acc.calories += item.totalCalories;
      acc.protein += item.totalProtein;
    }
    return acc;
  }, { calories: 0, protein: 0 });

  const handleAddLogItem = (itemData: any) => {
    addLog({
      date: new Date().toISOString().split('T')[0],
      userId: user?.uid || 'auth-user',
      name: itemData.name,
      isEaten: true,
      mealType: 'snack',
      calories: itemData.calories,
      protein: itemData.protein || 0,
      totalCalories: itemData.calories,
      totalProtein: itemData.protein || 0
    });
  };

  const handleSmartAdd = async () => {
    if (!searchText.trim()) return;
    setIsFinding(true);
    Keyboard.dismiss(); 
    try {
      const data = await getAccurateCalories(searchText, userLocation);
      handleAddLogItem(data);
      setSearchText(''); 
    } catch (error) { Alert.alert("AI Error", "Could not identify food."); } 
    finally { setIsFinding(false); }
  };

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      Vibration.vibrate(50); 
    } catch (err) { console.error(err); }
  }

  async function stopRecording() {
    if (!recording) return;
    Vibration.vibrate(50); 
    setRecording(null);
    setIsProcessingVoice(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI(); 
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const foodData = await identifyFoodFromVoice(base64);
        if (foodData) handleAddLogItem(foodData);
        else Alert.alert("Voice AI", "Could not identify food.");
      }
    } catch (error) { console.error(error); } 
    finally { setIsProcessingVoice(false); }
  }

  const renderCaloriesCard = () => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/stats')}>
        <LinearGradient
            colors={['#8d49fd', '#7f56f3', '#5691f3']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} 
            style={[styles.carouselCard, { width: CARD_WIDTH }]}
        >
            <View style={{ zIndex: 10 }}>
                <Text style={styles.widgetLabel}>Calories Left</Text>
                <Text style={styles.widgetValue}>{Math.max(0, goals.calories - totals.calories)}</Text>
                <Text style={styles.widgetSub}>/ {goals.calories} kcal goal</Text>
            </View>
            <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{Math.round((totals.calories / goals.calories) * 100)}%</Text>
            </View>
        </LinearGradient>
    </TouchableOpacity>
  );

  const renderProteinCard = () => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/stats')}>
        <LinearGradient
            colors={['#FF8C42', '#FF512F', '#DD2476']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={[styles.carouselCard, { width: CARD_WIDTH }]}
        >
            <View style={{ zIndex: 10 }}>
                <Text style={styles.widgetLabel}>Protein Goal</Text>
                <Text style={styles.widgetValue}>{totals.protein}g</Text>
                <Text style={styles.widgetSub}>/ {goals.protein}g target</Text>
            </View>
            <View style={styles.progressCircle}>
                <Feather name="zap" size={24} color="#FFF" />
            </View>
        </LinearGradient>
    </TouchableOpacity>
  );

  const renderEatenCard = () => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/stats')}>
        <LinearGradient
            colors={['#34D399', '#10B981', '#059669']}
            start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            style={[styles.carouselCard, { width: CARD_WIDTH }]}
        >
            <View style={{ zIndex: 10 }}>
                <Text style={styles.widgetLabel}>Total Eaten</Text>
                <Text style={styles.widgetValue}>{totals.calories}</Text>
                <Text style={styles.widgetSub}>kcal consumed</Text>
            </View>
            <View style={styles.progressCircle}>
                <Feather name="activity" size={24} color="#FFF" />
            </View>
        </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{flex: 1}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.username}>{displayName} 🔥</Text>
            </View>

            <View style={styles.headerActions}>
              
              {/* 👇 NEW RED NOTIFICATION BUTTON */}
              <TouchableOpacity 
                style={styles.notificationButton} 
                onPress={() => {
                    setHasUnread(false); // Clear dot immediately on press
                    router.push('/updates');
                }}
              >
                <Feather name="bell" size={20} color="#FFF" />
                {/* Yellow Dot logic */}
                {hasUnread && <View style={styles.redDot} />}
              </TouchableOpacity>

              {/* Profile Button */}
              <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => router.push('/profile')}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>
                          {displayName ? displayName[0].toUpperCase() : 'U'}
                      </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
            >
                {renderCaloriesCard()}
                {renderProteinCard()}
                {renderEatenCard()}
            </ScrollView>

            <View style={styles.indicatorContainer}>
                <View style={styles.indicatorTrack} />
                <Animated.View 
                  style={[
                    styles.indicatorFill, 
                    {
                      width: CARD_WIDTH / 3,
                      transform: [{
                        translateX: scrollX.interpolate({
                          inputRange: [0, CARD_WIDTH * 2],
                          outputRange: [0, (CARD_WIDTH / 3) * 2]
                        })
                      }]
                    }
                  ]} 
                />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.neonButton} 
            onPress={() => router.push('/insights')}
            activeOpacity={0.8}
          >
             <Text style={styles.neonButtonText}>Chat with Surf</Text>
             <Feather name="arrow-right" size={20} color="#000" />
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Add your Food</Text>
          <View style={[styles.smartBarContainer, recording && styles.smartBarRecording]}>
            <TouchableOpacity 
              style={[
                styles.searchButtonCircle, 
                recording && { backgroundColor: COLORS.danger }
              ]}
              onPress={handleSmartAdd}
              disabled={isFinding || !!recording}
            >
               {isFinding || isProcessingVoice ? (
                 <ActivityIndicator size="small" color="#FFF" />
               ) : recording ? (
                 <Feather name="mic" size={20} color="#FFF" />
               ) : (
                 <Feather name="search" size={20} color="#FFF" />
               )}
            </TouchableOpacity>

            {recording ? (
              <View style={styles.recordingContainer}>
                <Text style={styles.recordingText}>Listening...</Text>
              </View>
            ) : (
              <TextInput 
                style={styles.smartInput}
                placeholder="Type a meal..."
                placeholderTextColor={COLORS.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSmartAdd}
                returnKeyType="search"
                editable={!isProcessingVoice}
              />
            )}

            <View style={styles.rightIcons}>
              <TouchableOpacity 
                onPressIn={startRecording} 
                onPressOut={stopRecording}
                disabled={isFinding || isProcessingVoice}
              >
                 <Feather 
                   name="mic" 
                   size={22} 
                   color={recording ? COLORS.danger : '#18181b'} 
                 /> 
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            <TouchableOpacity 
                onPress={() => router.push('/history')}
                style={styles.calendarButton}
            >
                <Text style={styles.calendarText}>History</Text>
                <Feather name="calendar" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.logList}>
            {todaysLogs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>!!</Text>
                <Text style={styles.emptyText}>No logs yet</Text>
              </View>
            ) : (
              todaysLogs.map((item: DailyLogItem) => (
                <FoodCard 
                  key={item.id}
                  title={item.name || 'Unknown'}
                  calories={item.totalCalories}
                  protein={item.totalProtein}
                  isEaten={item.isEaten}
                  onToggle={() => toggleEaten(item.id, item.isEaten)}
                  onDelete={() => deleteLog(item.id)}
                />
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.l },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SPACING.xl 
  },
  greeting: { fontSize: 16, color: COLORS.textSecondary },
  username: { fontSize: 28, fontWeight: 'bold', color: COLORS.textPrimary },
  headerActions: { flexDirection: 'row', gap: SPACING.m }, // Gap between buttons
  
  // NEW NOTIFICATION BUTTON STYLE
notificationButton: {
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
     
    position: 'relative', // Needed for dot positioning
    overflow: 'visible',  // 👈 CRITICAL: Ensures dot isn't cut off
  },
  // THE YELLOW DOT
  redDot: {
      position: 'absolute',
      top: -2,  // Moved slightly up
      right: -2, // Moved slightly right
      width: 14, // Slightly bigger
      height: 14,
      borderRadius: 7,
      backgroundColor: '#FFD700', // Gold/Yellow (High contrast against red)
      borderWidth: 2,
      borderColor: '#3b0b0b', // Matches button bg to look cut-out
      zIndex: 10,
      elevation: 5,
  },

  profileButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: COLORS.cardHighlight, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },

  carouselCard: { 
    borderRadius: RADIUS.xl, 
    padding: SPACING.l, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    height: 160 
  },
  widgetLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4, fontWeight: '500' },
  widgetValue: { fontSize: 36, fontWeight: 'bold', color: '#FFF' },
  widgetSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  progressCircle: { 
    width: 70, 
    height: 70, 
    borderRadius: 35, 
    borderWidth: 4, 
    borderColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.1)' 
  },
  progressText: { color: '#FFF', fontWeight: 'bold' },

  indicatorContainer: { 
    marginTop: SPACING.m, 
    marginBottom: SPACING.xl, 
    height: 4, 
    width: CARD_WIDTH, 
    backgroundColor: COLORS.card, 
    borderRadius: 2, 
    overflow: 'hidden', 
    alignSelf: 'center' 
  },
  indicatorTrack: { flex: 1, backgroundColor: COLORS.card },
  indicatorFill: { height: '100%', backgroundColor: COLORS.textSecondary, borderRadius: 2 },

  neonButton: { 
    alignSelf: 'center', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    height: 56, 
    paddingHorizontal: 28, 
    borderRadius: 100, 
    backgroundColor: NEON_GREEN, 
    marginBottom: SPACING.xl, 
    gap: 8,
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 5, 
  },
  neonButtonText: { color: '#000000', fontSize: 19, fontWeight: 'bold', letterSpacing: 0.5 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: SPACING.m },

  smartBarContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#FFF', 
    borderRadius: 30, 
    padding: 5, 
    alignItems: 'center', 
    marginBottom: SPACING.xl, 
    height: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  smartBarRecording: { backgroundColor: '#fee2e2', borderColor: COLORS.danger, borderWidth: 1 },
  searchButtonCircle: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#18181b', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  smartInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, color: '#18181b' },
  recordingContainer: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  recordingText: { color: COLORS.danger, fontWeight: '600', fontStyle: 'italic' },
  rightIcons: { flexDirection: 'row', gap: 16, paddingRight: 20, alignItems: 'center' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACING.s },
  logList: { gap: SPACING.s },

  cardRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.card, 
    padding: SPACING.m, 
    borderRadius: RADIUS.m, 
    borderWidth: 1, 
    borderColor: COLORS.border 
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  cardSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: SPACING.m },
  checkButton: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.cardHighlight, justifyContent: 'center', alignItems: 'center' },
  checkButtonActive: { backgroundColor: COLORS.success },
  deleteButton: { justifyContent: 'center' },

  emptyState: { alignItems: 'center', marginTop: SPACING.xl },
  emptyText: { color: COLORS.textMuted, marginTop: SPACING.s },

  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: COLORS.cardHighlight,
    borderRadius: 8,
  },
  calendarText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});