// src/screens/AiInsightsScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useFoodLog } from '../../../hooks/useFoodLog';
import { getAiCoaching } from '../api/gemini';
import { useTheme } from '../context/ThemeContext';
import { SPACING, RADIUS } from '../theme';

const NEON_GREEN = '#ADFF2F';

// Default Bot Avatar (fallback)
const DEFAULT_BOT_AVATAR = 'https://i.postimg.cc/Zq19S7Mt/adaptive.png';

// Onboarding Starter Chips
const STARTER_CHIPS = [
  '🥑 Make me a daily routine',
  '🍔 I just ate a pizza, judge me.',
  '💪 How much protein in a shoe?',
  '🍕 Best late-night snacks?',
  '🥗 Make my salad exciting!',
];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: Date;
}

export default function AiInsightsScreen() {
  const router = useRouter();
  const { logs } = useFoodLog(); // Access real food data
  const { theme: themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [botAvatar, setBotAvatar] = useState(DEFAULT_BOT_AVATAR);

  // Fetch bot avatar from Firestore on mount
  useEffect(() => {
    const fetchBotAvatar = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'app_settings'));
        if (configDoc.exists()) {
          const data = configDoc.data();
          if (data?.botAvatarUrl) {
            setBotAvatar(data.botAvatarUrl);
          }
        }
      } catch (error) {
        // Silently fail and use default avatar
        console.log('Using default bot avatar');
      }
    };
    fetchBotAvatar();
  }, []);

  // Check if we should show onboarding starters
  const showStarters = messages.length === 0;

  const handleSend = async (customText?: string) => {
    const messageText = customText || input;
    if (!messageText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      time: new Date()
    };

    // 1. Add User Message
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 2. Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    // 3. Get AI Response (Passing logs for context)
    const aiResponseText = await getAiCoaching(userMsg.text, logs);

    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText || "Something is wrong. Try again!",
      sender: 'ai',
      time: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Dynamic theme colors
  const themeColors = {
    background: isDark ? '#131313' : '#F5F5F5',
    headerBorder: isDark ? '#1C1C1E' : '#E0E0E0',
    headerText: isDark ? '#FFF' : '#000',
    aiBubble: isDark ? '#2C2C2E' : '#FFFFFF',
    aiText: isDark ? '#FFF' : '#000',
    inputBg: isDark ? '#1C1C1E' : '#FFFFFF',
    inputText: isDark ? '#FFF' : '#000',
    inputBorder: isDark ? '#333' : '#DDD',
    placeholderColor: isDark ? '#888' : '#999',
  };

  // Markdown styles for AI messages
  const markdownStyles = StyleSheet.create({
    body: { fontSize: 16, lineHeight: 22, color: themeColors.aiText },
    heading1: { fontSize: 20, fontWeight: '700', color: themeColors.aiText, marginBottom: 8 },
    heading2: { fontSize: 18, fontWeight: '600', color: themeColors.aiText, marginBottom: 6 },
    paragraph: { marginBottom: 8 },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },
    bullet_list: { marginBottom: 8 },
    ordered_list: { marginBottom: 8 },
    list_item: { marginBottom: 4 },
    code_inline: { 
      backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0', 
      paddingHorizontal: 4, 
      borderRadius: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    fence: { 
      backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0', 
      padding: 10, 
      borderRadius: 8,
      marginVertical: 8,
    },
    link: { color: NEON_GREEN },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header - only show after first message (Instagram style) */}
        {messages.length > 0 && (
          <View style={[styles.header, { borderBottomColor: themeColors.headerBorder }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="chevron-left" size={28} color={themeColors.headerText} />
            </TouchableOpacity>
            <View style={styles.headerProfile}>
              <Image 
                source={{ uri: botAvatar }} 
                style={styles.headerAvatar}
              />
              <Text style={[styles.headerTitle, { color: themeColors.headerText }]}>Surf AI</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        )}

        {/* Chat Area */}
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Onboarding Starters */}
          {showStarters && (
            <View style={styles.startersContainer}>
              <View style={styles.welcomeSection}>
                <Image 
                  source={{ uri: botAvatar }} 
                  style={styles.welcomeAvatar}
                />
                <Text style={[styles.welcomeTitle, { color: themeColors.headerText }]}>
                  Hey, I'm Surf! 🏄
                </Text>
                <Text style={[styles.welcomeSubtitle, { color: themeColors.placeholderColor }]}>
                  Your AI nutrition buddy. Ask me anything about your diet!
                </Text>
              </View>
              
              <Text style={[styles.startersLabel, { color: themeColors.placeholderColor }]}>
                Try asking...
              </Text>
              <View style={styles.chipsContainer}>
                {STARTER_CHIPS.map((chip, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.chip, { backgroundColor: themeColors.aiBubble }]}
                    onPress={() => handleSend(chip)}
                    disabled={loading}
                  >
                    <Text style={[styles.chipText, { color: themeColors.aiText }]}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.bubble, 
                msg.sender === 'user' 
                  ? styles.userBubble 
                  : [styles.aiBubble, { backgroundColor: themeColors.aiBubble }]
              ]}
            >
              {msg.sender === 'user' ? (
                <Text style={[styles.msgText, styles.userText]}>
                  {msg.text}
                </Text>
              ) : (
                <Markdown style={markdownStyles}>
                  {msg.text}
                </Markdown>
              )}
            </View>
          ))}
        
          {loading && (
            <View style={[styles.loadingBubble, { backgroundColor: themeColors.aiBubble }]}>
              <ActivityIndicator size="small" color={NEON_GREEN} />
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: themeColors.inputBg, borderTopColor: themeColors.inputBorder }]}>
            <TextInput 
                style={[styles.input, { 
                  backgroundColor: themeColors.background, 
                  color: themeColors.inputText,
                  borderColor: themeColors.inputBorder 
                }]}
                placeholder="Ask about your diet..."
                placeholderTextColor={themeColors.placeholderColor}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity 
                style={[styles.sendButton, !input.trim() && styles.sendDisabled]} 
                onPress={() => handleSend()}
                disabled={!input.trim() || loading}
            >
                <Feather name="send" size={20} color="#000" />
            </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.s, 
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
  },
  backButton: { 
    padding: 4,
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 10,
    backgroundColor: NEON_GREEN,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  
  chatContent: { padding: SPACING.m, gap: SPACING.m, paddingBottom: 40 },
  
  // Onboarding Starters
  startersContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  welcomeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.m,
    backgroundColor: NEON_GREEN,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: SPACING.l,
  },
  startersLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.m,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.s,
    paddingHorizontal: SPACING.m,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Bubbles
  bubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: NEON_GREEN,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  
  msgText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#000', fontWeight: '500' },

  loadingBubble: {
    alignSelf: 'flex-start',
    padding: 12,
    borderRadius: 16,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    borderWidth: 1,
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: NEON_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.s,
  },
  sendDisabled: {
    backgroundColor: '#333',
    opacity: 0.5
  }
});