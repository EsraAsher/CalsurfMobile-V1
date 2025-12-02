// app/settings/goals.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../.vscode/src/config/firebase';
import { useTheme } from '../../.vscode/src/context/ThemeContext';

export default function GoalsScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.calories) setCalories(data.calories.toString());
            if (data.protein) setProtein(data.protein.toString());
            if (data.age) setAge(data.age.toString());
            if (data.height) setHeight(data.height.toString());
            if (data.weight) setWeight(data.weight.toString());
          }
        } catch (e) {
          console.error('Error fetching data:', e);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          calories: parseInt(calories) || 2000,
          protein: parseInt(protein) || 150,
          age: age ? parseInt(age) : null,
          height: height ? parseFloat(height) : null,
          weight: weight ? parseFloat(weight) : null,
        });
        Alert.alert('Success', 'Health goals updated');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Health Goals</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Daily Calories (kcal)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={calories}
            onChangeText={setCalories}
            placeholder="2000"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Protein Goal (g)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={protein}
            onChangeText={setProtein}
            placeholder="150"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Age (years)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={age}
            onChangeText={setAge}
            placeholder="25"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Height (cm)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={height}
            onChangeText={setHeight}
            placeholder="175"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Weight (kg)</Text>
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={weight}
            onChangeText={setWeight}
            placeholder="70"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  inputContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    paddingVertical: 4,
  },
  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
