// src/screens/AiInsightsScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFoodLog } from '../../../hooks/useFoodLog';
import { getAiCoaching } from '../api/gemini';
import { COLORS, SPACING, RADIUS } from '../theme';

const NEON_GREEN = '#ADFF2F';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  time: Date;
}

export default function AiInsightsScreen() {
  const router = useRouter();
  const { logs } = useFoodLog(); // Access real food data
  const scrollViewRef = useRef<ScrollView>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Yo! I'm Surf. I see what you ate today. Ask me anything about your progress or what to eat next!",
      sender: 'ai',
      time: new Date()
    }
  ]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
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
      text: aiResponseText || "I couldn't generate a response. Try again!",
      sender: 'ai',
      time: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="chevron-left" size={28} color="#FFF" />
        </TouchableOpacity>
        <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
        </View>
        <View style={{ width: 28 }} /> 
      </View>

      {/* Chat Area */}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg) => (
          <View 
            key={msg.id} 
            style={[
                styles.bubble, 
                msg.sender === 'user' ? styles.userBubble : styles.aiBubble
            ]}
          >
            {msg.sender === 'ai' && (
                <View style={styles.botIcon}>
                    <Feather name="zap" size={14} color="#000" />
                </View>
            )}
            <Text style={[
                styles.msgText, 
                msg.sender === 'user' ? styles.userText : styles.aiText
            ]}>
                {msg.text}
            </Text>
          </View>
        ))}
        
        {loading && (
            <View style={styles.loadingBubble}>
                <ActivityIndicator size="small" color={NEON_GREEN} />
            </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.inputContainer}>
            <TextInput 
                style={styles.input}
                placeholder="Ask about your diet..."
                placeholderTextColor={COLORS.textMuted}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleSend}
            />
            <TouchableOpacity 
                style={[styles.sendButton, !input.trim() && styles.sendDisabled]} 
                onPress={handleSend}
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
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.m, 
    paddingVertical: SPACING.s,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E'
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 12, color: NEON_GREEN, textAlign: 'center' },
  
  chatContent: { padding: SPACING.m, gap: SPACING.m, paddingBottom: 40 },
  
  bubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginBottom: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2C2C2E',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: NEON_GREEN,
    borderBottomLeftRadius: 4,
    position: 'relative',
    marginLeft: 12,
  },
  botIcon: {
    position: 'absolute',
    left: -24,
    bottom: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: NEON_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8
  },
  
  msgText: { fontSize: 16, lineHeight: 22 },
  userText: { color: '#FFF' },
  aiText: { color: '#000', fontWeight: '500' },

  loadingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 16,
    marginLeft: 12,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    backgroundColor: '#1C1C1E',
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: '#000',
    borderRadius: 25,
    paddingHorizontal: 20,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333'
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