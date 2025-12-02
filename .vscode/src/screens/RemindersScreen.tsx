// src/screens/RemindersScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, 
  ScrollView, Alert, Platform, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { SPACING, RADIUS } from '../theme';
import { useTheme } from '../context/ThemeContext';

// --- TYPES ---
type Frequency = 'Daily' | 'Weekly' | 'Monthly';

interface Reminder {
  id: string;
  label: string;
  time: string; // Stored as ISO string for display
  enabled: boolean;
  type: 'notification' | 'alarm';
  frequency: Frequency;
  notificationId?: string;
}

export default function RemindersScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // --- STATE ---
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('Water');
  
  // Default to 5 mins from now to avoid confusion
  const [newTime, setNewTime] = useState(new Date(Date.now() + 5 * 60000));
  
  const [newType, setNewType] = useState<'notification' | 'alarm'>('notification');
  const [newFrequency, setNewFrequency] = useState<Frequency>('Daily');
  
  const [showPicker, setShowPicker] = useState(false);

  // --- 1. SETUP CHANNELS (ANDROID) ---
  useEffect(() => {
    async function setupChannels() {
      if (Platform.OS === 'android') {
        // Channel for Silent/Normal
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Regular Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
        });

        // Channel for LOUD Alarms
        await Notifications.setNotificationChannelAsync('thicc_alarm_v2', {
          name: 'Loud Alarms',
          importance: Notifications.AndroidImportance.MAX, 
          vibrationPattern: [0, 500, 1000, 500, 1000, 500], 
          enableVibrate: true,
          sound: 'default', 
          bypassDnd: true, 
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    }
    setupChannels();
  }, []);

  // --- 2. LOAD FROM DB ---
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
            // Sort by time
            const raw = docSnap.data().reminders || [];
            raw.sort((a: Reminder, b: Reminder) => new Date(a.time).getTime() - new Date(b.time).getTime());
            setReminders(raw);
        }
        setLoading(false);
    });
    return unsub;
  }, [user]);

  // --- 3. SCHEDULING ENGINE (FIXED) ---
  const scheduleAlert = async (
      label: string, 
      date: Date, 
      type: 'notification' | 'alarm',
      frequency: Frequency
  ) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
        Alert.alert("Permission", "Enable notifications to use this feature.");
        return null;
    }

    try {
        // Build trigger with proper type for expo-notifications
        let trigger: Notifications.NotificationTriggerInput;

        if (frequency === 'Daily') {
            // Daily repeating notification
            trigger = {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: date.getHours(),
                minute: date.getMinutes(),
            };
        } else if (frequency === 'Weekly') {
            // Weekly repeating notification
            trigger = {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                hour: date.getHours(),
                minute: date.getMinutes(),
                weekday: date.getDay() + 1, // 1-7 (Sunday = 1)
            };
        } else {
            // Monthly - use calendar trigger
            trigger = {
                type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
                hour: date.getHours(),
                minute: date.getMinutes(),
                day: date.getDate(),
                repeats: true,
            };
        }

        // Android channel configuration
        const androidConfig = Platform.OS === 'android' ? {
            channelId: type === 'alarm' ? 'thicc_alarm_v2' : 'default',
        } : {};

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: type === 'alarm' ? `🚨 ${label.toUpperCase()}!` : label,
                body: `Time to log your ${label.toLowerCase()}.`,
                sound: true,
                color: type === 'alarm' ? colors.danger : colors.primary,
                ...androidConfig,
            },
            trigger,
        });

        console.log(`✅ Scheduled ${frequency} notification at ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')} (ID: ${id})`);
        return id;
    } catch (e) {
        console.error("Schedule Error:", e);
        Alert.alert("Error", "Failed to schedule notification. Please check logs.");
        return null;
    }
  };

  // --- 4. TIME HANDLER ---
  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setNewTime(selectedDate);
  };

  // --- 5. ACTIONS ---
  const handleAddReminder = async () => {
    if (!user) return;
    
    try {
        const notifId = await scheduleAlert(newLabel, newTime, newType, newFrequency);
        if (!notifId) return;

        const newReminder: Reminder = {
            id: Date.now().toString(),
            label: newLabel,
            time: newTime.toISOString(),
            enabled: true,
            type: newType,
            frequency: newFrequency,
            notificationId: notifId
        };

        await updateDoc(doc(db, 'users', user.uid), {
            reminders: arrayUnion(newReminder)
        });
        
        setIsAdding(false);
        Alert.alert("Success", `${newLabel} reminder set for ${newTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`);
    } catch (e) {
        console.error("Add reminder error:", e);
        Alert.alert("Error", "Could not save reminder.");
    }
  };

  const handleDelete = async (item: Reminder) => {
      if (!user) return;
      try {
          if (item.notificationId) {
              await Notifications.cancelScheduledNotificationAsync(item.notificationId);
          }
          await updateDoc(doc(db, 'users', user.uid), {
              reminders: arrayRemove(item)
          });
      } catch (e) {
          console.error("Delete error:", e);
      }
  };

  const handleToggle = async (index: number, val: boolean) => {
      if (!user) return;
      const item = reminders[index];
      let newNotifId = item.notificationId;

      try {
          if (val) {
              newNotifId = await scheduleAlert(
                  item.label, 
                  new Date(item.time), 
                  item.type, 
                  item.frequency
              ) || '';
          } else {
              if (item.notificationId) {
                  await Notifications.cancelScheduledNotificationAsync(item.notificationId);
              }
              newNotifId = '';
          }

          const updatedList = [...reminders];
          updatedList[index] = { ...item, enabled: val, notificationId: newNotifId };
          await updateDoc(doc(db, 'users', user.uid), { reminders: updatedList });
      } catch (e) {
          console.error("Toggle error:", e);
      }
  };

  return (
    <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Feather name="chevron-left" size={28} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Reminders</Text>
            <TouchableOpacity onPress={() => setIsAdding(!isAdding)}>
                <Feather name={isAdding ? "x" : "plus"} size={24} color={colors.primary} />
            </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
            
            {/* ADD FORM */}
            {isAdding && (
                <View style={styles.addForm}>
                    <Text style={styles.sectionTitle}>New Reminder</Text>
                    
                    {/* 1. Label */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 20}}>
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Water', 'Gym', 'Meds'].map(l => (
                            <TouchableOpacity 
                                key={l} 
                                style={[styles.chip, newLabel === l && styles.chipActive]}
                                onPress={() => setNewLabel(l)}
                            >
                                <Text style={[styles.chipText, newLabel === l && styles.chipTextActive]}>{l}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* 2. Time */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Time</Text>
                        {Platform.OS === 'android' ? (
                            <>
                                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.androidPickerBtn}>
                                    <Text style={styles.androidPickerText}>
                                        {newTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </Text>
                                </TouchableOpacity>
                                {showPicker && (
                                    <DateTimePicker
                                        value={newTime}
                                        mode="time"
                                        display="default"
                                        onChange={onTimeChange}
                                    />
                                )}
                            </>
                        ) : (
                            <DateTimePicker
                                value={newTime}
                                mode="time"
                                display="default"
                                onChange={onTimeChange}
                                themeVariant="dark"
                                style={{ width: 100 }}
                            />
                        )}
                    </View>

                    {/* 3. Frequency */}
                    <View style={styles.row}>
                        <Text style={styles.label}>Repeat</Text>
                        <View style={{flexDirection:'row', gap: 8}}>
                            {['Daily', 'Weekly', 'Monthly'].map((f) => (
                                <TouchableOpacity 
                                    key={f} 
                                    style={[styles.smallChip, newFrequency === f && styles.smallChipActive]}
                                    onPress={() => setNewFrequency(f as Frequency)}
                                >
                                    <Text style={[styles.smallChipText, newFrequency === f && styles.chipTextActive]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 4. Type */}
                    <View style={styles.row}>
                        <View>
                            <Text style={styles.label}>Loud Alarm</Text>
                            <Text style={styles.subLabel}>Overrides silent mode</Text>
                        </View>
                        <Switch 
                            value={newType === 'alarm'} 
                            onValueChange={(v) => setNewType(v ? 'alarm' : 'notification')}
                            trackColor={{ false: colors.cardHighlight, true: colors.danger }}
                        />
                    </View>

                    <TouchableOpacity style={styles.saveButton} onPress={handleAddReminder}>
                        <Text style={styles.saveButtonText}>Set Reminder</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* LIST */}
            <Text style={styles.listTitle}>Your Schedule</Text>
            
            {loading ? (
                <ActivityIndicator color={colors.primary} />
            ) : reminders.length === 0 ? (
                <View style={styles.emptyState}>
                    <Feather name="bell-off" size={40} color={colors.textMuted} />
                    <Text style={styles.emptyText}>No reminders set yet.</Text>
                </View>
            ) : (
                reminders.map((item, index) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardLeft}>
                            <Text style={styles.cardTime}>
                                {new Date(item.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                            <View style={styles.tagRow}>
                                <Text style={styles.cardLabel}>{item.label}</Text>
                                <View style={styles.dot} />
                                <Text style={styles.freqText}>{item.frequency || 'Daily'}</Text>
                                {item.type === 'alarm' && (
                                    <View style={styles.alarmBadge}>
                                        <Feather name="bell" size={10} color="#FFF" />
                                        <Text style={styles.alarmText}>LOUD</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        
                        <View style={styles.cardRight}>
                            <Switch 
                                value={item.enabled}
                                onValueChange={(v) => handleToggle(index, v)}
                                trackColor={{ false: colors.cardHighlight, true: colors.primary }}
                            />
                            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                                <Feather name="trash-2" size={18} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}

        </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  content: { padding: SPACING.l },
  
  addForm: { backgroundColor: colors.card, padding: SPACING.m, borderRadius: RADIUS.m, marginBottom: SPACING.xl },
  sectionTitle: { color: colors.textPrimary, fontWeight: 'bold', marginBottom: SPACING.m },
  
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.cardHighlight, marginRight: 8 },
  smallChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.cardHighlight },
  chipActive: { backgroundColor: colors.primary },
  smallChipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.textPrimary },
  smallChipText: { color: colors.textPrimary, fontSize: 12 },
  chipTextActive: { color: '#000', fontWeight: 'bold' },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
  label: { color: colors.textPrimary, fontSize: 16 },
  subLabel: { color: colors.textMuted, fontSize: 12 },
  
  saveButton: { backgroundColor: colors.primary, padding: 16, borderRadius: RADIUS.m, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#000', fontWeight: 'bold' },

  androidPickerBtn: { backgroundColor: colors.cardHighlight, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  androidPickerText: { color: colors.textPrimary, fontWeight: 'bold' },

  listTitle: { color: colors.textMuted, marginBottom: SPACING.m, fontWeight: '600' },
  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: SPACING.m, borderRadius: RADIUS.m, marginBottom: SPACING.m },
  cardLeft: { gap: 4 },
  cardTime: { color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { color: colors.textMuted, fontSize: 14 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.border },
  freqText: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic' },
  alarmBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.danger, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4 },
  alarmText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  deleteBtn: { padding: 4 },
  
  emptyState: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
  emptyText: { color: colors.textMuted, marginTop: 10 },
});