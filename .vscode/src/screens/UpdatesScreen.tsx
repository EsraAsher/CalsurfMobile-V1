// src/screens/UpdatesScreen.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet'; // The Magic Library

import { db } from '../config/firebase';
import { COLORS, SPACING, RADIUS, FONTS } from '../theme';

export default function UpdatesScreen() {
  const router = useRouter();
  const [updates, setUpdates] = useState<any[]>([]);
  
  // Ref for the bottom sheet
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Snap points (50% of screen, 90% of screen)
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Fetch Updates
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUpdates(data);
    });
    return unsubscribe;
  }, []);

  const formatDate = (isoString: string) => {
      if (!isoString) return '';
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Close handler (navigates back when sheet is closed)
  const handleSheetChanges = (index: number) => {
    if (index === -1) {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      {/* Invisible Touchable to close when clicking outside */}
      <TouchableOpacity 
        style={StyleSheet.absoluteFill} 
        activeOpacity={1} 
        onPress={() => router.back()} 
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={0} // Starts at 50%
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true} // Drag down to close
        backgroundStyle={{ backgroundColor: '#1C1C1E' }} // Dark Card Background
        handleIndicatorStyle={{ backgroundColor: '#555', width: 50 }}
      >
        <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Latest Updates</Text>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{updates.length}</Text>
            </View>
        </View>

        <BottomSheetScrollView contentContainerStyle={styles.content}>
            {updates.length === 0 && (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No updates yet. Stay tuned!</Text>
                </View>
            )}

            {updates.map((item) => (
                <View key={item.id} style={styles.tweetCard}>
                    <View style={styles.tweetRow}>
                        <View style={styles.avatar}>
                            <Feather name="zap" size={18} color="#000" />
                        </View>
                        
                        <View style={{flex: 1}}>
                            <View style={styles.tweetHeader}>
                                <Text style={styles.authorName}>CalSurf Team</Text>
                                <Feather name="check-circle" size={14} color={COLORS.primary} style={{marginHorizontal: 4}} />
                                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                            </View>
                            <Text style={styles.tweetContent}>{item.content}</Text>
                        </View>
                    </View>
                </View>
            ))}
            <View style={{ height: 40 }} />
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black overlay
  },
  sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: SPACING.s,
      borderBottomWidth: 1,
      borderBottomColor: '#2C2C2E',
      marginBottom: SPACING.m,
  },
  sheetTitle: {
      color: '#FFF',
      fontSize: 18,
      fontFamily: FONTS.heading,
      marginRight: 8,
  },
  badge: {
      backgroundColor: COLORS.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
  },
  badgeText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: 'bold',
  },
  content: {
      paddingHorizontal: SPACING.l,
  },
  
  // Tweet Styles
  tweetCard: { 
      paddingVertical: SPACING.m,
      borderBottomWidth: 1, 
      borderBottomColor: '#2C2C2E',
  },
  tweetRow: { flexDirection: 'row', gap: 12 },
  avatar: { 
      width: 36, 
      height: 36, 
      borderRadius: 18, 
      backgroundColor: COLORS.neon, 
      justifyContent: 'center', 
      alignItems: 'center' 
  },
  tweetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  authorName: { color: '#FFF', fontWeight: 'bold', fontSize: 15, fontFamily: FONTS.sub },
  dateText: { color: COLORS.textMuted, fontSize: 13 },
  tweetContent: { color: '#EAEAEA', fontSize: 15, lineHeight: 22, fontFamily: FONTS.body },
  
  emptyState: { marginTop: 50, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontFamily: FONTS.body }
});