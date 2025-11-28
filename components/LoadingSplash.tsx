// src/components/LoadingSplash.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../.vscode/src/theme';

export default function LoadingSplash() {
  return (
    <View style={styles.container}>
      {/* Logo Icon */}
      <View style={styles.iconCircle}>
        <Feather name="activity" size={48} color="#000" />
      </View>

      {/* App Name */}
      <Text style={styles.title}>CAL<Text style={{color: COLORS.neon}}>SURF</Text></Text>
      
      {/* Loading Spinner */}
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size="large" color={COLORS.neon} />
      </View>
      
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131313', // App Background
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.neon,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 40,
  },
  spinnerContainer: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#555',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});