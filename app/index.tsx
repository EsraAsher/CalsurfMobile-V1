// app/index.tsx
import React from 'react';
import { View } from 'react-native';
import DailyTrackerScreen from '../.vscode/src/screens/DailyTrackerScreen';

export default function Index() {
  return (
    <View style={{ flex: 1 }}>
      <DailyTrackerScreen />
    </View>
  );
}