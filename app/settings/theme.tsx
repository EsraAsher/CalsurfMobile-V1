// app/settings/theme.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../.vscode/src/context/ThemeContext';

export default function ThemeScreen() {
  const router = useRouter();
  const { mode, colors, setMode } = useTheme();

  const themeOptions = [
    { key: 'light', label: 'Light', icon: 'sun' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
    { key: 'system', label: 'System', icon: 'smartphone' },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Theme</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>
          Choose your preferred theme or let the system decide automatically.
        </Text>

        {themeOptions.map((option) => {
          const isSelected = mode === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.themeOption,
                { 
                  backgroundColor: colors.card, 
                  borderColor: isSelected ? colors.primary : colors.border,
                  borderWidth: isSelected ? 2 : 1
                }
              ]}
              onPress={() => setMode(option.key)}
            >
              <View style={styles.themeLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.cardHighlight }]}>
                  <Feather 
                    name={option.icon} 
                    size={20} 
                    color={isSelected ? colors.primary : colors.textPrimary} 
                  />
                </View>
                <Text style={[styles.themeLabel, { color: isSelected ? colors.primary : colors.textPrimary }]}>
                  {option.label}
                </Text>
              </View>
              {isSelected && <Feather name="check-circle" size={24} color={colors.primary} />}
            </TouchableOpacity>
          );
        })}
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
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  themeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
