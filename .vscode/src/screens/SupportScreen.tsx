import React, { useEffect, useMemo, useState } from 'react';
import { 
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
  UIManager,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  Keyboard
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';

import { COLORS, SPACING, RADIUS } from '../theme';
import { auth, db } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

type FAQItem = {
  id: string;
  question: string;
  answer: string;
  order?: number;
};

const SUBJECT_OPTIONS = ['Bug Report', 'Feature Request', 'Account Issue', 'Other'];

// How many "Top Questions" to show when not searching
const TOP_FAQ_LIMIT = 4;

// Constants for header animation
const SCROLL_THRESHOLD = 50;
const HEADER_HEIGHT = 44;

// Generate a readable ticket ID in format ###-XXX
const generateTicketId = (): string => {
  const digits = String(Math.floor(Math.random() * 900) + 100); // 100-999
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join('');
  return `${digits}-${letters}`;
};

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;
  const { colors } = useTheme();

  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Ticket Form States
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);

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

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'faqs'));
        const docs = snapshot.docs
          .map(docSnap => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<FAQItem, 'id'>)
          }))
          // Sort by order so the "Top 4" are always the most important ones
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setFaqData(docs);
      } catch (error) {
        // Silent fail or retry logic could go here
        console.log('Error fetching FAQs', error);
      } finally {
        setLoadingFaqs(false);
      }
    };

    fetchFaqs();
  }, []);

  const filteredFaqs = useMemo(() => {
    // 1. If searching, search questions only
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      return faqData.filter(item =>
        item.question.toLowerCase().includes(query)
      );
    }
    // 2. If NOT searching, show only the Top 4 (Selected FAQs)
    return faqData.slice(0, TOP_FAQ_LIMIT);
  }, [faqData, searchQuery]);

  const toggleItem = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(prev => (prev === id ? null : id));
  };

  const resetTicketForm = () => {
    setTicketSubject('');
    setTicketMessage('');
    setSubjectMenuOpen(false);
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject) {
      Alert.alert('Missing Subject', 'Please choose a subject so we can route your ticket.');
      return;
    }
    if (!ticketMessage.trim()) {
      Alert.alert('Missing Details', 'Let us know what is going on so we can help.');
      return;
    }

    // Word count validation
    const wordCount = ticketMessage.trim().split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount < 30) {
      Alert.alert('Too Short', 'Write at least 30 words so we can understand your issue.');
      return;
    }
    if (wordCount > 600) {
      Alert.alert('Too Long', 'Please keep your message under 600 words.');
      return;
    }

    try {
      setSubmittingTicket(true);

      // Generate unique ticket ID (collision extremely unlikely with timestamp suffix)
      const ticketId = generateTicketId();

      await addDoc(collection(db, 'support_tickets'), {
        ticketId,
        userId: user?.uid ?? 'anonymous',
        userEmail: user?.email ?? 'unknown',
        subject: ticketSubject,
        message: ticketMessage.trim(),
        status: 'open',
        createdAt: serverTimestamp()
      });

      resetTicketForm();
      Alert.alert(
        'Ticket Submitted',
        `Ticket #${ticketId} received. We will email you shortly.`,
        [{ text: 'OK', onPress: () => setTicketModalVisible(false) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not submit your ticket. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const renderFaqItem = (item: FAQItem) => {
    const isOpen = expandedId === item.id;
    return (
      <View key={item.id} style={[styles.faqItem, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.faqHeader}
          onPress={() => toggleItem(item.id)}
        >
          <Text style={[styles.question, { color: colors.textPrimary }]}>{item.question}</Text>
          <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
        </TouchableOpacity>
        {isOpen && (
          <Text style={[styles.answer, { color: colors.textMuted }]}>{item.answer}</Text>
        )}
      </View>
    );
  };

  if (loadingFaqs) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

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
            Support
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
          Support
        </Animated.Text>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}> 
          <Feather name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder="Search for 'Diet', 'Account', etc."
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); }}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Title */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          {searchQuery ? 'Search Results' : 'Common Questions'}
        </Text>

        {/* FAQ List */}
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map(item => renderFaqItem(item))
        ) : (
          <Text style={[styles.emptyState, { color: colors.textMuted }]}>
            No answers found for "{searchQuery}".
          </Text>
        )}

        {/* Still Stuck Section */}
        <View style={[styles.devSection, { backgroundColor: colors.neon }]}> 
          <Text style={styles.devTitle}>Still stuck?</Text>
          <Text style={styles.devSub}>Open a ticket and our crew will reach back.</Text>
          <TouchableOpacity 
            style={[styles.ticketButton, { backgroundColor: colors.card }]} 
            onPress={() => setTicketModalVisible(true)}
          >
            <Text style={[styles.ticketButtonText, { color: colors.textPrimary }]}>Submit a Ticket</Text>
            <Feather name="arrow-up-right" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>CalSurf 1.0.0</Text>
      </Animated.ScrollView>

      {/* Ticket Modal - Fixed Layout Issues */}
      <Modal
        animationType="slide"
        transparent
        visible={ticketModalVisible}
        onRequestClose={() => {
          setTicketModalVisible(false);
          resetTicketForm();
        }}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Submit a Ticket</Text>
              <TouchableOpacity onPress={() => { setTicketModalVisible(false); resetTicketForm(); }}>
                <Feather name="x" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Subject</Text>
              <View style={{ zIndex: 10 }}> 
                <TouchableOpacity
                  style={[styles.dropdown, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setSubjectMenuOpen(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownText, { color: ticketSubject ? colors.textPrimary : colors.textMuted }]}>
                    {ticketSubject || 'Choose a subject'}
                  </Text>
                  <Feather name={subjectMenuOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
                {subjectMenuOpen && (
                  <View style={[styles.dropdownMenu, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    {SUBJECT_OPTIONS.map(option => (
                      <TouchableOpacity
                        key={option}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setTicketSubject(option);
                          setSubjectMenuOpen(false);
                        }}
                      >
                        <Text style={[styles.dropdownOptionText, { color: colors.textPrimary }]}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textMuted, marginTop: SPACING.m }]}>Message</Text>
              <TextInput
                style={[styles.messageInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
                multiline
                numberOfLines={4}
                placeholder="Give us all the context..."
                placeholderTextColor={colors.textMuted}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.neon }]}
                onPress={handleSubmitTicket}
                disabled={submittingTicket}
              >
                {submittingTicket ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Ticket</Text>
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
    marginBottom: 20,
    marginTop: 8,
  },
  
  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 24,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    fontFamily: 'DMSans_400Regular',
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  
  // FAQ Items
  faqItem: { 
    paddingVertical: 16, 
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  faqHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  question: { 
    flex: 1, 
    fontSize: 16, 
    fontFamily: 'DMSans_500Medium',
    marginRight: 12,
  },
  answer: { 
    marginTop: 12, 
    fontSize: 15, 
    fontFamily: 'DMSans_400Regular',
    lineHeight: 22,
  },
  
  // Still Stuck Section
  devSection: { 
    borderRadius: 16, 
    padding: 20, 
    marginTop: 32,
  },
  devTitle: { 
    fontSize: 20, 
    fontFamily: 'DMSans_700Bold',
    color: '#000', 
    marginBottom: 4,
  },
  devSub: { 
    fontSize: 14, 
    fontFamily: 'DMSans_400Regular',
    color: 'rgba(0,0,0,0.7)', 
    marginBottom: 16,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  ticketButtonText: { 
    fontSize: 16, 
    fontFamily: 'DMSans_600SemiBold',
  },
  version: { 
    textAlign: 'center', 
    fontSize: 12, 
    fontFamily: 'DMSans_400Regular',
    marginTop: 24,
  },
  
  emptyState: { 
    textAlign: 'center', 
    marginTop: 32,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
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
    minHeight: 120,
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