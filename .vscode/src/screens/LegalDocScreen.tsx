// src/screens/LegalDocScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import Markdown from 'react-native-markdown-display';
import { db } from '../config/firebase';
import { SPACING } from '../theme';

type LegalDoc = {
  title: string;
  content: string;
  lastUpdated: Timestamp | string;
};

export default function LegalDocScreen() {
  const router = useRouter();
  const { docId } = useLocalSearchParams<{ docId: string }>();

  const [loading, setLoading] = useState(true);
  const [legalDoc, setLegalDoc] = useState<LegalDoc | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchDoc = async () => {
      if (!docId) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'legal', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setLegalDoc(docSnap.data() as LegalDoc);
        } else {
          setError(true);
        }
      } catch (e) {
        console.log('Error fetching legal doc:', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [docId]);

  // Format the lastUpdated date
  const formatDate = (date: Timestamp | string): string => {
    if (!date) return '';
    
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // If it's already a string, return as-is or try to parse
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date;
    }
    
    return '';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !legalDoc) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Document not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{legalDoc.title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {legalDoc.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last Updated: {formatDate(legalDoc.lastUpdated)}
          </Text>
        )}

        <Markdown style={markdownStyles}>
          {legalDoc.content}
        </Markdown>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E4E4'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.s
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: SPACING.l
  },
  lastUpdated: {
    fontSize: 13,
    color: '#888888',
    marginBottom: SPACING.m
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.l
  },
  errorText: {
    fontSize: 16,
    color: '#888888'
  }
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#000000',
    fontSize: 15,
    lineHeight: 24
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginTop: 14,
    marginBottom: 6
  },
  heading3: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginTop: 12,
    marginBottom: 4
  },
  paragraph: {
    marginBottom: 12
  },
  listItem: {
    marginBottom: 6
  },
  link: {
    color: '#007AFF'
  },
  blockquote: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#CCCCCC',
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8
  },
  code_inline: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: 'monospace'
  },
  fence: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8
  }
});
