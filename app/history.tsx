// app/history.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../.vscode/src/theme';
import { useFoodLog } from '../hooks/useFoodLog';

// --- COMPONENTS ---

const HistoryCard = ({ date, calories, protein, items, metGoal }: any) => {
    const [expanded, setExpanded] = React.useState(false);

    return (
        <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => setExpanded(!expanded)}
            style={[styles.card, metGoal && styles.cardGoalMet]}
        >
            {/* Header Row */}
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.dateText}>{new Date(date).toDateString().slice(0, 10)}</Text>
                    <Text style={styles.itemsText}>{items.length} items logged</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={[styles.totalCals, metGoal && { color: '#ADFF2F' }]}>{calories} kcal</Text>
                    <Text style={styles.totalProt}>{protein}g protein</Text>
                </View>
            </View>

            {/* Expanded Details (Food Items) */}
            {expanded && (
                <View style={styles.expandedList}>
                    <View style={styles.divider} />
                    {items.map((item: any, index: number) => (
                        <View key={index} style={styles.foodItemRow}>
                            <Text style={styles.foodName}>{item.name}</Text>
                            <Text style={styles.foodStats}>{item.calories} cal</Text>
                        </View>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function HistoryPage() {
    const router = useRouter();
    const { logs } = useFoodLog();
    const GOAL = 2000; // Daily Goal

    // --- GROUP LOGS BY DATE ---
    const history = useMemo(() => {
        const groups: Record<string, any> = {};
        
        logs.forEach(log => {
            if (!groups[log.date]) {
                groups[log.date] = { date: log.date, calories: 0, protein: 0, items: [] };
            }
            // Only count eaten items
            if (log.isEaten) {
                groups[log.date].calories += log.totalCalories;
                groups[log.date].protein += log.totalProtein;
                groups[log.date].items.push(log);
            }
        });

        // Convert to array and sort descending (newest first)
        return Object.values(groups).sort((a: any, b: any) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [logs]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Title */}
            <Text style={styles.pageTitle}>Log History</Text>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {history.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Feather name="calendar" size={48} color={COLORS.textMuted} />
                        <Text style={styles.emptyText}>No history yet. Start logging!</Text>
                    </View>
                ) : (
                    history.map((day: any) => (
                        <HistoryCard 
                            key={day.date}
                            date={day.date}
                            calories={day.calories}
                            protein={day.protein}
                            items={day.items}
                            metGoal={day.calories >= GOAL}
                        />
                    ))
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    pageTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: SPACING.xl, marginTop: SPACING.m, marginLeft: SPACING.l },
    scrollContent: { padding: SPACING.l, paddingTop: 0 },
    
    // Card Styles
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        borderWidth: 1,
        borderColor: '#333',
    },
    cardGoalMet: {
        borderColor: '#ADFF2F', // Neon border if goal met
        backgroundColor: 'rgba(173, 255, 47, 0.05)', // Very subtle green tint
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
    itemsText: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    totalCals: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    totalProt: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },

    // Expanded List
    expandedList: { marginTop: SPACING.m },
    divider: { height: 1, backgroundColor: '#333', marginBottom: SPACING.s },
    foodItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    foodName: { color: COLORS.textSecondary, fontSize: 14 },
    foodStats: { color: COLORS.textMuted, fontSize: 13 },

    // Empty State
    emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { color: COLORS.textMuted, marginTop: SPACING.m },
});