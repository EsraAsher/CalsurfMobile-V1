// src/screens/GetHelpScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../config/firebase';

// Types
type SettingsRow = {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  route?: string;
  params?: any;
  onPress?: () => void;
  color?: string;
};

// Constants
const SCROLL_THRESHOLD = 50;
const HEADER_HEIGHT = 44;
const FEEDBACK_TYPES = ['General Feedback', 'Feature Request', 'Bug Report', 'UI/UX Suggestion', 'Other'];
const MAX_WORDS = 800;

// Sanitize text to only allow safe characters
const sanitizeText = (text: string): string => {
  // Remove any HTML tags, scripts, and special characters that could be harmful
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Count words in text
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// --- COMPONENT: SETTINGS ROW ---
const SettingsRowItem = ({ item, colors, isLast }: { item: SettingsRow; colors: any; isLast?: boolean }) => {
  const router = useRouter();
  
  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      if (item.params) {
        router.push({ pathname: item.route as any, params: item.params });
      } else {
        router.push(item.route as any);
      }
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row, 
        { borderBottomColor: colors.border },
        !isLast && styles.rowBorder
      ]}
      onPress={handlePress}
      activeOpacity={0.6}
    >
      <View style={styles.rowLeft}>
        <Feather 
          name={item.icon} 
          size={24} 
          color={item.color || colors.textPrimary}
          style={styles.rowIcon}
        />
        <Text style={[styles.rowTitle, { color: item.color || colors.textPrimary }]}>
          {item.title}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
};

export default function GetHelpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const user = auth.currentUser;

  // Feedback Modal States
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Scroll animation
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Animated header styles
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const headerTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [SCROLL_THRESHOLD - 20, SCROLL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const largeTitleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, SCROLL_THRESHOLD],
      [1, 0],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Reset feedback form
  const resetFeedbackForm = () => {
    setFeedbackType('');
    setFeedbackMessage('');
    setTypeMenuOpen(false);
  };

  // Handle text input with sanitization
  const handleMessageChange = (text: string) => {
    const sanitized = sanitizeText(text);
    const wordCount = countWords(sanitized);
    
    // Only allow up to MAX_WORDS
    if (wordCount <= MAX_WORDS) {
      setFeedbackMessage(sanitized);
    }
  };

  // Submit feedback
  const handleSubmitFeedback = async () => {
    if (!feedbackType) {
      Alert.alert('Missing Type', 'Please choose a feedback type.');
      return;
    }
    
    const sanitizedMessage = sanitizeText(feedbackMessage);
    const wordCount = countWords(sanitizedMessage);
    
    if (wordCount < 10) {
      Alert.alert('Too Short', 'Please write at least 10 words to help us understand your feedback.');
      return;
    }
    
    if (wordCount > MAX_WORDS) {
      Alert.alert('Too Long', `Please keep your feedback under ${MAX_WORDS} words.`);
      return;
    }

    try {
      setSubmittingFeedback(true);

      await addDoc(collection(db, 'feedback'), {
        userId: user?.uid ?? 'anonymous',
        userEmail: user?.email ?? 'unknown',
        type: feedbackType,
        message: sanitizedMessage,
        createdAt: serverTimestamp()
      });

      resetFeedbackForm();
      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted. We appreciate you taking the time to help us improve!',
        [{ text: 'OK', onPress: () => setFeedbackModalVisible(false) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not submit your feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Get help items
  const getHelpItems: SettingsRow[] = [
    { title: 'Support Center', icon: 'help-circle', route: '/support' },
    { 
      title: 'Give us Feedback', 
      icon: 'message-circle', 
      onPress: () => setFeedbackModalVisible(true)
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sticky Animated Header */}
      <Animated.View 
        style={[
          styles.stickyHeader, 
          { paddingTop: insets.top, backgroundColor: colors.background },
          headerAnimatedStyle
        ]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Animated.Text 
            style={[styles.headerTitle, { color: colors.textPrimary }, headerTitleAnimatedStyle]}
          >
            Get Help
          </Animated.Text>
          <View style={{ width: 28 }} />
        </View>
      </Animated.View>

      {/* Fixed Back Button (Always visible) */}
      <View style={[styles.fixedBackButton, { top: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + HEADER_HEIGHT }]}
      >
        {/* Large Title */}
        <Animated.Text 
          style={[styles.largeTitle, { color: colors.textPrimary }, largeTitleAnimatedStyle]}
        >
          Get Help
        </Animated.Text>

        {/* Get Help List */}
        {getHelpItems.map((item, index) => (
          <SettingsRowItem 
            key={item.title} 
            item={item} 
            colors={colors}
            isLast={false}
          />
        ))}
      </Animated.ScrollView>

      {/* Feedback Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={feedbackModalVisible}
        onRequestClose={() => {
          setFeedbackModalVisible(false);
          resetFeedbackForm();
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Give us Feedback</Text>
              <TouchableOpacity onPress={() => { setFeedbackModalVisible(false); resetFeedbackForm(); }}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Feedback Type</Text>
              <View style={{ zIndex: 10 }}> 
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setTypeMenuOpen(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownText, { color: feedbackType ? colors.textPrimary : colors.textMuted }]}>
                    {feedbackType || 'Choose a type'}
                  </Text>
                  <Feather name={typeMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {typeMenuOpen && (
                  <View style={[styles.dropdownMenu, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    {FEEDBACK_TYPES.map(option => (
                      <TouchableOpacity
                        key={option}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setFeedbackType(option);
                          setTypeMenuOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, { color: colors.textPrimary }]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.messageLabelRow}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: 16 }]}>Your Feedback</Text>
                <Text style={[styles.wordCount, { color: colors.textMuted }]}>
                  {countWords(feedbackMessage)}/{MAX_WORDS} words
                </Text>
              </View>
              <TextInput
                style={[styles.messageInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                multiline
                numberOfLines={6}
                placeholder="Tell us what you think..."
                placeholderTextColor={colors.textMuted}
                value={feedbackMessage}
                onChangeText={handleMessageChange}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.neon }]}
                onPress={handleSubmitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerContent: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: { 
    padding: 4 
  },
  headerTitle: { 
    fontSize: 17, 
    fontFamily: 'DMSans_600SemiBold',
  },
  
  // Fixed back button
  fixedBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 99,
  },
  
  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  
  // Large Title
  largeTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    marginBottom: 24,
    marginTop: 8,
  },
  
  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  rowBorder: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_400Regular',
    flex: 1,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 20, 
    fontFamily: 'DMSans_700Bold',
  },
  
  fieldLabel: { 
    fontSize: 13, 
    fontFamily: 'DMSans_500Medium',
    marginBottom: 8,
  },
  messageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 16,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownText: { 
    fontSize: 15, 
    fontFamily: 'DMSans_400Regular',
  },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'absolute',
    top: 52,
    width: '100%',
    zIndex: 100,
  },
  dropdownOption: { 
    paddingVertical: 14, 
    paddingHorizontal: 14,
  },
  dropdownOptionText: { 
    fontSize: 15, 
    fontFamily: 'DMSans_400Regular',
  },
  
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 150,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  submitBtn: {
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: { 
    fontSize: 16, 
    fontFamily: 'DMSans_600SemiBold',
    color: '#000',
  },
});
