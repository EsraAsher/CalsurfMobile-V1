// src/screens/UpdatesScreen.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Vibration, BackHandler, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, increment, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { db, auth } from '../config/firebase';
import { SPACING, RADIUS, FONTS } from '../theme';
import { useTheme } from '../context/ThemeContext';

interface Update {
  id: string;
  content: string;
  createdAt: string;
  imageUrl?: string;
  likes: number;
  authorName?: string;
  authorAvatar?: string;
}

interface SpamState {
  count: number;
  locked: boolean;
}

export default function UpdatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [spamStates, setSpamStates] = useState<Record<string, SpamState>>({});
  
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);
  const backdropOpacity = useSharedValue(1);
  const spamTimers = useRef<Record<string, ReturnType<typeof setTimeout> | undefined>>({});
  const user = auth.currentUser;

  // Load user's liked posts from Firestore subcollection
  useEffect(() => {
    if (!user) return;

    const loadUserLikes = async () => {
      try {
        const liked = new Set<string>();
        for (const update of updates) {
          const likeDocRef = doc(db, 'updates', update.id, 'likes', user.uid);
          const likeDoc = await getDoc(likeDocRef);
          if (likeDoc.exists()) {
            liked.add(update.id);
          }
        }
        setLikedPosts(liked);
      } catch (error) {
        console.error('Error loading user likes:', error);
      }
    };

    if (updates.length > 0) {
      loadUserLikes();
    }
  }, [updates, user]);

  // Fetch Updates
  useEffect(() => {
    const q = query(collection(db, "updates"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })) as Update[];
        setUpdates(data);
        setLoading(false);
      },
      (error) => {
        console.log('Firestore listener error:', error.message);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  const formatRelativeTime = (timestamp: any) => {
    // Fallback for null/undefined
    if (!timestamp) return "i dont know when";
    
    let date: Date;
    
    // Check if it's a Firestore Timestamp (has seconds property)
    if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
      date = new Date(timestamp.seconds * 1000);
    } 
    // Check if it's already a Date object
    else if (timestamp instanceof Date) {
      date = timestamp;
    }
    // Try parsing as string/number
    else {
      date = new Date(timestamp);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) return "i dont know when";
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'now'; // Future date edge case
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleLike = async (updateId: string) => {
    if (!user) return;

    // Check spam state
    const currentSpam = spamStates[updateId] || { count: 0, locked: false };
    if (currentSpam.locked) return;

    // Increment spam counter
    const newCount = currentSpam.count + 1;
    
    // Clear existing timer
    if (spamTimers.current[updateId]) {
      clearTimeout(spamTimers.current[updateId]);
    }

    // Easter egg trigger
    if (newCount >= 5) {
      Vibration.vibrate(400);
      setSpamStates(prev => ({
        ...prev,
        [updateId]: { count: newCount, locked: true }
      }));

      // Reset after 3 seconds
      setTimeout(() => {
        setSpamStates(prev => ({
          ...prev,
          [updateId]: { count: 0, locked: false }
        }));
      }, 3000);
      return;
    }

    // Update spam state
    setSpamStates(prev => ({
      ...prev,
      [updateId]: { count: newCount, locked: false }
    }));

    // Reset counter after 2 seconds of inactivity
    spamTimers.current[updateId] = setTimeout(() => {
      setSpamStates(prev => ({
        ...prev,
        [updateId]: { count: 0, locked: false }
      }));
    }, 2000);

    const isLiked = likedPosts.has(updateId);
    const likeDocRef = doc(db, 'updates', updateId, 'likes', user.uid);
    const updateDocRef = doc(db, 'updates', updateId);

    try {
      if (isLiked) {
        // Unlike
        await deleteDoc(likeDocRef);
        await updateDoc(updateDocRef, { likes: increment(-1) });
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(updateId);
          return newSet;
        });
      } else {
        // Like
        await setDoc(likeDocRef, { 
          userId: user.uid,
          timestamp: new Date().toISOString()
        });
        await updateDoc(updateDocRef, { likes: increment(1) });
        setLikedPosts(prev => new Set(prev).add(updateId));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Navigate back function (called from worklet)
  const navigateBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle sheet position to fade backdrop as it moves
  const handleAnimate = useCallback((fromIndex: number, toIndex: number) => {
    if (toIndex === -1) {
      // Fading out as sheet closes
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, []);

  // Close handler (navigates back when sheet is closed)
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      // Immediately hide backdrop and navigate
      backdropOpacity.value = 0;
      router.back();
    }
  }, [router]);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      bottomSheetRef.current?.close();
      return true;
    });
    return () => backHandler.remove();
  }, []);

  // Animated backdrop style
  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Handle backdrop press to close
  const handleBackdropPress = useCallback(() => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    bottomSheetRef.current?.close();
  }, []);

  return (
    <View style={styles.container}>
      {/* Custom Animated Backdrop */}
      <Animated.View style={[styles.backdrop, animatedBackdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />
      </Animated.View>
      
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        onAnimate={handleAnimate}
        enablePanDownToClose={true}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted, width: 50 }}
        animateOnMount={true}
        enableContentPanningGesture={true}
        enableHandlePanningGesture={true}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Latest Updates</Text>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : updates.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="bell-off" size={40} color={colors.textMuted} />
              <Text style={styles.emptyText}>No updates yet. Stay tuned!</Text>
            </View>
          ) : (
            updates.map((item) => {
              const isLiked = likedPosts.has(item.id);
              const displayLikes = (item.likes || 0) + 124;
              const authorName = item.authorName || 'CalSurf Team';
              const authorAvatar = item.authorAvatar;
              const spamState = spamStates[item.id];
              const isSpamLocked = spamState?.locked;

              return (
                <View key={item.id} style={styles.feedCard}>
                  <View style={styles.feedHeader}>
                    {authorAvatar ? (
                      <Image 
                        source={{ uri: authorAvatar }} 
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatar}>
                        <Feather name="zap" size={18} color="#000" />
                      </View>
                    )}
                    
                    <View style={styles.headerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.authorName}>{authorName}</Text>
                        <Feather name="moon" size={14} color="#1DA1F2" />
                      </View>
                      <Text style={styles.timeText}>{formatRelativeTime(item.createdAt)}</Text>
                    </View>
                  </View>

                  <Text style={styles.feedContent}>{item.content || ''}</Text>

                  {item.imageUrl && (
                    <Image 
                      source={{ uri: item.imageUrl }} 
                      style={styles.feedImage}
                      resizeMode="cover"
                    />
                  )}

                  <View style={styles.feedFooter}>
                    {isSpamLocked ? (
                      <View style={styles.spamMessage}>
                        <Text style={styles.spamText}>Hold your horses buddy 🐴</Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={styles.likeButton} 
                        onPress={() => handleLike(item.id)}
                        activeOpacity={0.7}
                      >
                        <Feather 
                          name="heart" 
                          size={18} 
                          color={isLiked ? '#E0245E' : colors.textMuted}
                          fill={isLiked ? '#E0245E' : 'transparent'}
                        />
                        <Text style={[styles.likeCount, isLiked && styles.likeCountActive]}>
                          {displayLikes}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: SPACING.s,
  },
  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.heading,
    fontWeight: 'bold',
    marginRight: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: SPACING.l,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  feedCard: { 
    backgroundColor: colors.background,
    borderRadius: RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.s,
  },
  avatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#ADFF2F',
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 10,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: colors.cardHighlight,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: { 
    color: colors.textPrimary, 
    fontWeight: 'bold', 
    fontSize: 16, 
    fontFamily: FONTS.sub 
  },
  timeText: { 
    color: colors.textMuted, 
    fontSize: 14,
    marginTop: 2,
  },
  feedContent: { 
    color: colors.textPrimary, 
    fontSize: 15, 
    lineHeight: 22, 
    fontFamily: FONTS.body,
    marginBottom: SPACING.s,
  },
  feedImage: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: RADIUS.m,
    marginBottom: SPACING.s,
    backgroundColor: colors.cardHighlight,
  },
  feedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeCount: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  likeCountActive: {
    color: '#E0245E',
  },
  spamMessage: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.cardHighlight,
    borderRadius: 8,
  },
  spamText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: { 
    marginTop: 60, 
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { 
    color: colors.textMuted, 
    fontFamily: FONTS.body,
    fontSize: 16,
  }
});
