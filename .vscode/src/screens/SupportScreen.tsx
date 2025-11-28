// src/screens/SupportScreen.tsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Platform, LayoutAnimation, UIManager 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- DATA: THE "VIBE CHECK" FAQ ---
const FAQS = [
    {
        q: "Is the AI judging my food? 🤨",
        a: "Lowkey, yes. But it's only because Surf wants you to hit those goals. Don't take it personal, just eat the protein."
    },
    {
        q: "Why isn't my mic working? 🎤",
        a: "You probably denied permissions in 2023 and forgot. Go to your phone Settings and let us hear you."
    },
    {
        q: "Can I cheat on my diet? 🍕",
        a: "I mean, you *can*, but don't lie to the app. Log it. Own it. We go again tomorrow."
    },
    {
        q: "My calorie goal seems sus... 🤔",
        a: "It's just math based on what you told us. If you're starving or stuffed, go to Settings and tweak it. You know your body best."
    },
    {
        q: "Where is my data going? ☁️",
        a: "Nowhere sketchy. It stays in your secure cloud account so you don't lose your streaks. We don't sell your info to weirdos."
    }
];

const FAQItem = ({ item, isOpen, onPress }: any) => (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.faqItem}>
        <View style={styles.faqHeader}>
            <Text style={styles.question}>{item.q}</Text>
            <Feather 
                name={isOpen ? "minus" : "plus"} 
                size={20} 
                color={isOpen ? COLORS.neon : COLORS.textMuted} 
            />
        </View>
        {isOpen && (
            <Text style={styles.answer}>{item.a}</Text>
        )}
    </TouchableOpacity>
);

export default function SupportScreen() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleEmail = () => {
      // Replace with your actual email
      Linking.openURL('mailto:placeholder@gmail.com?subject=Yo Dev! Suggestion for CalSurf');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Minimal Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Intro */}
        <Text style={styles.subtitle}>
            Got questions? We got answers. Usually.
        </Text>

        {/* FAQ Section */}
        <View style={styles.faqList}>
            {FAQS.map((item, index) => (
                <FAQItem 
                    key={index} 
                    item={item} 
                    isOpen={openIndex === index} 
                    onPress={() => toggleIndex(index)} 
                />
            ))}
        </View>

        {/* "Ask the Dev" Section */}
        <View style={styles.devSection}>
            <Text style={styles.devTitle}>Still confused?</Text>
            <Text style={styles.devSub}>
                Found a bug? Have a feature idea? Just wanna say hi?
            </Text>
            
            <TouchableOpacity style={styles.emailButton} onPress={handleEmail} activeOpacity={0.8}>
                <View style={styles.iconCircle}>
                    <Feather name="mail" size={24} color="#000000ff" />
                </View>
                <View>
                    <Text style={styles.emailBtnText}>Slide into the Dev's DMs</Text>
                    <Text style={styles.emailBtnSub}>placeholder@gmail.com</Text>
                </View>
                <Feather name="arrow-up-right" size={24} color="#f3f3f3ff" style={{marginLeft: 'auto'}} />
            </TouchableOpacity>
        </View>

        <Text style={styles.version}>CalSurf v1.0 • Built with ☕ & 💻</Text>
        <View style={{height: 40}} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#131313' },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SPACING.l, 
    paddingTop: SPACING.m, 
    paddingBottom: SPACING.m,
    gap: SPACING.m
  },
  backBtn: { 
    padding: 4 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#FFF', 
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto' 
  },

  content: { padding: SPACING.l },
  subtitle: { fontSize: 16, color: COLORS.textMuted, marginBottom: SPACING.xl },

  // FAQ Styles
  faqList: { gap: SPACING.m, marginBottom: SPACING.xl * 1.5 },
  faqItem: { paddingVertical: SPACING.m, borderBottomWidth: 1, borderBottomColor: '#222' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  question: { fontSize: 16, fontWeight: '600', color: '#FFF', flex: 1, marginRight: 10 },
  answer: { marginTop: SPACING.m, fontSize: 15, color: COLORS.textMuted, lineHeight: 22 },

  // Dev Section
  devSection: { backgroundColor: COLORS.neon, borderRadius: RADIUS.l, padding: SPACING.l },
  devTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  devSub: { fontSize: 14, color: 'rgba(0,0,0,0.7)', marginBottom: SPACING.l },
  
  emailButton: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.9)', 
    padding: SPACING.m, borderRadius: RADIUS.m,
    gap: SPACING.m
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.neon, justifyContent: 'center', alignItems: 'center' },
  emailBtnText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  emailBtnSub: { fontSize: 12, color: '#555' },

  version: { textAlign: 'center', color: '#444', marginTop: SPACING.xl, fontSize: 12 },
});