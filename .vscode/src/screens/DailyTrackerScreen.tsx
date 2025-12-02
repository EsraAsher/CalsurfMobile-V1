// src/screens/DailyTrackerScreen.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- FIREBASE IMPORTS ---
import { doc, getDoc, collection, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// --- CUSTOM HOOKS & API ---
import { useFoodLog } from '@/hooks/useFoodLog';
import { getAccurateCalories, getUserRegion, identifyFoodFromVoice, getCelebrationMessage } from '../api/gemini';
import { DailyLogItem } from '../types/data';
import { SPACING, RADIUS, ThemeColors } from '../theme';
import { useTheme } from '../context/ThemeContext';
import CelebrationOverlay from '../../../components/CelebrationOverlay';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (SPACING.l * 2); 

// --- MAIN SCREEN ---
export default function DailyTrackerScreen() {
  const user = auth.currentUser;
  const { logs: dailyLog, addLog, deleteLog, todayKey } = useFoodLog();
  const router = useRouter(); 
  const { voiceData } = useLocalSearchParams();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [userLocation, setUserLocation] = useState<string>('Locating...');
  const [searchText, setSearchText] = useState('');
  const [isFinding, setIsFinding] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Profile State
  const [avatar, setAvatar] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Thicc User');
  const [goals, setGoals] = useState({ calories: 2000, protein: 150 });
  
  // Notification State
  const [hasUnread, setHasUnread] = useState(false);

  // Celebration State
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationData, setCelebrationData] = useState({ percentage: 0, message: '' });
  const [milestonesHit, setMilestonesHit] = useState<Set<number>>(new Set());

  const scrollX = useRef(new Animated.Value(0)).current;

  // --- REAL-TIME NOTIFICATION LISTENER ---
  useEffect(() => {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
            const latestPost = snapshot.docs[0].data();
            const latestTime = new Date(latestPost.createdAt).getTime();
            
            const lastSeen = await AsyncStorage.getItem('lastViewedUpdates');
            const seenTime = lastSeen ? new Date(lastSeen).getTime() : 0;

            if (latestTime > seenTime) {
                setHasUnread(true);
            } else {
                setHasUnread(false);
            }
        }
    });

    return () => unsubscribe();
  }, []);

  // --- REAL-TIME PROFILE DATA LISTENER ---
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.photoURL) setAvatar(data.photoURL);
        const realName = data.displayName || data.name || user.displayName || "Thicc User";
        setDisplayName(realName);
        if (data.calories) {
            setGoals(prev => ({ ...prev, calories: data.calories }));
        }
        if (data.protein) {
            setGoals(prev => ({ ...prev, protein: data.protein }));
        }
      } else {
        if (user.photoURL) setAvatar(user.photoURL);
        if (user.displayName) setDisplayName(user.displayName);
      }
    }, (error) => {
      console.log("Error listening to profile:", error);
    });

    getUserRegion().then(setUserLocation);

    return () => unsubscribe();
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

  const todaysLogs = dailyLog;

  const totals = todaysLogs.reduce((acc: { calories: number; protein: number }, item: DailyLogItem) => {
    if (item.isEaten) {
      acc.calories += item.totalCalories;
      acc.protein += item.totalProtein;
    }
    return acc;
  }, { calories: 0, protein: 0 });

  // --- CHECK FOR CELEBRATION MILESTONES ---
  useEffect(() => {
    const checkMilestone = async () => {
      const percentage = Math.floor((totals.calories / goals.calories) * 100);
      const today = todayKey;
      
      const milestones = [70, 90, 100];
      for (const milestone of milestones) {
        if (percentage >= milestone) {
          const celebrationKey = `celebration_${today}_${milestone}`;
          
          const alreadyCelebrated = await AsyncStorage.getItem(celebrationKey);
          
          if (!alreadyCelebrated) {
            const message = await getCelebrationMessage(milestone);
            setCelebrationData({ percentage: milestone, message });
            setCelebrationVisible(true);
            
            await AsyncStorage.setItem(celebrationKey, 'true');
            
            setMilestonesHit(prev => new Set(prev).add(milestone));
            break;
          }
        }
      }
    };

    checkMilestone();
  }, [totals.calories, goals.calories, todayKey]);

  const FoodCard = ({ title, calories, protein, onDelete }: { title: string; calories: number; protein: number; onDelete: () => void }) => (
    <View style={styles.cardRow}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{calories} kcal  •  {protein}g protein</Text>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Feather name="trash-2" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const handleAddLogItem = (itemData: any) => {
    addLog({
      userId: user?.uid || 'auth-user',
      name: itemData.name || searchText || 'Unknown Food',
      isEaten: true,
      mealType: 'snack',
      calories: itemData.calories || 0,
      protein: itemData.protein || 0,
      totalCalories: itemData.calories || 0,
      totalProtein: itemData.protein || 0,
      totalCarbs: itemData.carbs || 0,
      totalFats: itemData.fats || 0
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
        colors={colors.gradients.calories}
        start={{ x: 0.5, y: 0 }} 
        end={{ x: 0.5, y: 1 }} 
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
        colors={colors.gradients.protein}
        start={{ x: 0.5, y: 0 }} 
        end={{ x: 0.5, y: 1 }}
        style={[styles.carouselCard, { width: CARD_WIDTH }]}
      >
        <View style={{ zIndex: 10 }}>
          <Text style={styles.widgetLabel}>Protein Goal</Text>
          <Text style={styles.widgetValue}>{totals.protein}g</Text>
          <Text style={styles.widgetSub}>/ {goals.protein}g target</Text>
        </View>
        <View style={styles.progressCircle}>
          <Feather name="zap" size={24} color={colors.onGradientText} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEatenCard = () => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/stats')}>
      <LinearGradient
        colors={colors.gradients.eaten}
        start={{ x: 0.5, y: 0 }} 
        end={{ x: 0.5, y: 1 }}
        style={[styles.carouselCard, { width: CARD_WIDTH }]}
      >
        <View style={{ zIndex: 10 }}>
          <Text style={styles.widgetLabel}>Total Eaten</Text>
          <Text style={styles.widgetValue}>{totals.calories}</Text>
          <Text style={styles.widgetSub}>kcal consumed</Text>
        </View>
        <View style={styles.progressCircle}>
          <Feather name="activity" size={24} color={colors.onGradientText} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(92, 255, 47, 0.55)', 'transparent']}
        style={styles.ambientGlow}
        pointerEvents="none"
      />
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />
      <SafeAreaView style={{flex: 1}}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Hello,</Text>
              <Text style={styles.username}>{displayName} 🔥</Text>
            </View>

            <View style={styles.headerActions}>
              
              <TouchableOpacity 
                style={styles.notificationButton} 
                onPress={() => {
                    setHasUnread(false);
                    router.push('/updates');
                }}
              >
                <Feather name="bell" size={20} color={colors.danger} />
                {hasUnread && <View style={styles.redDot} />}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.profileButton} 
                onPress={() => router.push('/profile')}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                ) : (
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.onGradientText, fontWeight: 'bold', fontSize: 16 }}>
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
            style={styles.chatBubbleButton} 
            onPress={() => router.push('/insights')}
            activeOpacity={0.8}
          >
            <Text style={styles.chatBubbleText}>Surf Chat</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Add your Food</Text>
          <View style={styles.smartBarContainer}>
            <TouchableOpacity 
              style={[
                styles.searchButtonCircle, 
                recording && { backgroundColor: colors.danger }
              ]}
              onPress={handleSmartAdd}
              disabled={isFinding || !!recording}
            >
               {isFinding || isProcessingVoice ? (
                 <ActivityIndicator size="small" color={colors.onGradientText} />
               ) : recording ? (
                 <Feather name="mic" size={20} color={colors.onGradientText} />
               ) : (
                 <Feather name="search" size={20} color={colors.onGradientText} />
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
                placeholderTextColor={colors.textMuted}
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
                   color={recording ? colors.danger : colors.textPrimary} 
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
              <Feather name="calendar" size={18} color={colors.textMuted} />
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
                  onDelete={() => deleteLog(item.id)}
                />
              ))
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>

      <CelebrationOverlay
        visible={celebrationVisible}
        percentage={celebrationData.percentage}
        message={celebrationData.message}
        onClose={() => setCelebrationVisible(false)}
      />
    </View>
  );
}

const withOpacity = (hex: string, opacity: number) => {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized;
  const int = parseInt(expanded, 16);

  if (Number.isNaN(int)) {
    return hex;
  }

  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    zIndex: 0,
  },
  scrollContent: { padding: SPACING.l, zIndex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  greeting: { fontSize: 16, color: colors.textSecondary },
  username: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary },
  headerActions: { flexDirection: 'row', gap: SPACING.m },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
  },
  redDot: {
    position: 'absolute',
    top: -2,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.background,
    zIndex: 10,
    elevation: 5,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cardHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  carouselCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 160,
    overflow: 'hidden',
  },
  widgetLabel: { color: withOpacity(colors.onGradientText, 0.9), fontSize: 14, marginBottom: 4, fontWeight: '500' },
  widgetValue: { fontSize: 36, fontWeight: 'bold', color: colors.onGradientText },
  widgetSub: { fontSize: 12, color: withOpacity(colors.onGradientText, 0.8) },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: withOpacity(colors.onGradientText, 0.2),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: withOpacity(colors.onGradientText, 0.1),
  },
  progressText: { color: colors.onGradientText, fontWeight: 'bold' },
  indicatorContainer: {
    marginTop: SPACING.m,
    marginBottom: SPACING.xl,
    height: 0,
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: 2,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  indicatorTrack: { flex: 1, backgroundColor: colors.card },
  indicatorFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  chatBubbleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    backgroundColor: colors.neon,
    marginBottom: SPACING.xl,
    alignSelf: 'flex-start',
    gap: 10,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  chatBubbleText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: SPACING.m },
  smartBarContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 30,
    padding: 5,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    height: 60,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  smartBarRecording: { },
  searchButtonCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartInput: { flex: 1, height: '100%', paddingHorizontal: 12, fontSize: 16, color: colors.textPrimary },
  recordingContainer: { flex: 1, paddingHorizontal: 12, justifyContent: 'center' },
  recordingText: { color: colors.danger, fontWeight: '600', fontStyle: 'italic' },
  rightIcons: { flexDirection: 'row', gap: 16, paddingRight: 20, alignItems: 'center' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: SPACING.s },
  logList: { gap: SPACING.s },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: SPACING.m,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  cardSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: SPACING.m },
  deleteButton: { justifyContent: 'center' },
  emptyState: { alignItems: 'center', marginTop: SPACING.xl },
  emptyText: { color: colors.textMuted, marginTop: SPACING.s },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: colors.cardHighlight,
    borderRadius: 8,
  },
  calendarText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});