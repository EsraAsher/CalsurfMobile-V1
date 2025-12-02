// app/stats.tsx
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS } from '../.vscode/src/theme';
import { useTheme } from '../.vscode/src/context/ThemeContext';
import { useFoodLog } from '../hooks/useFoodLog'; // 1. Import Hook
import { useTrueDate } from '../hooks/useTrueDate'; // Anti-cheat hook

const { width } = Dimensions.get('window');

// --- MAIN PAGE ---

export default function StatsPage() {
    const router = useRouter();
    const { colors } = useTheme();
    const [view, setView] = useState('Week');
    
    // 2. Get Real Data with Anti-cheat
    const { allLogs, todayKey, formatDateLabel } = useFoodLog();
    const { getTodayDateKey, isReady: trueDateReady } = useTrueDate();
    
    const styles = useMemo(() => createStyles(colors), [colors]);

    // --- COMPONENTS ---
    const SegmentControl = ({ selected, onChange }: any) => (
        <View style={styles.segmentContainer}>
            {['Day', 'Week', 'Month', 'Year'].map((tab) => (
                <TouchableOpacity 
                    key={tab} 
                    style={[styles.segmentButton, selected === tab && styles.segmentActive]} 
                    onPress={() => onChange(tab)}
                >
                    <Text style={[styles.segmentText, selected === tab && styles.segmentTextActive]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const DetailRow = ({ label, value, unit = '' }: any) => (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}{unit}</Text>
        </View>
    );

    const StatGridItem = ({ label, value, color }: any) => (
        <View style={styles.statGridItem}>
            <Text style={styles.gridValue}>{value}</Text>
            <Text style={styles.gridLabel}>{label}</Text>
        </View>
    );

    const BarChart = ({ data }: any) => (
        <View style={styles.chartContainer}>
            {data.map((d: any, i: number) => (
                <View key={i} style={styles.barColumn}>
                    <View style={[styles.barFill, { 
                        // Scale bar relative to a max of 2500 (or higher if data demands)
                        height: `${Math.min((d.value / 3000) * 100, 100)}%`, 
                        backgroundColor: d.metGoal ? '#ADFF2F' : '#333' 
                    }]} />
                    {d.label ? <Text style={styles.barLabel}>{d.label}</Text> : null}
                </View>
            ))}
        </View>
    );

    // 3. The "Brain": Calculate Stats based on View
    const stats = useMemo(() => {
        const todayStr = todayKey; // Use anti-cheat protected date
        const GOAL = 2000; // Daily Goal

        // --- Helper: Group Logs by Date (using dateKey) ---
        const logsByDate: Record<string, { cals: number, prot: number, carbs: number, fats: number }> = {};
        allLogs.forEach(log => {
            const key = log.dateKey || log.date;
            if (!logsByDate[key]) logsByDate[key] = { cals: 0, prot: 0, carbs: 0, fats: 0 };
            if (log.isEaten) {
                logsByDate[key].cals += log.totalCalories;
                logsByDate[key].prot += log.totalProtein;
                logsByDate[key].carbs += log.totalCarbs || 0;
                logsByDate[key].fats += log.totalFats || 0;
            }
        });

        // --- Helper: Generate date key for offset days ---
        const getDateKey = (daysOffset: number): string => {
            const d = new Date();
            d.setDate(d.getDate() - daysOffset);
            return d.toISOString().split('T')[0];
        };

        // --- Logic Per View ---
        let chartData: { label: string; value: number; metGoal: boolean }[] = [];
        let totalCals = 0;
        let avgCals = 0;
        let avgProt = 0;
        let avgCarbs = 0;
        let avgFats = 0;
        let highestCalDay = 0;

        if (view === 'Day') {
            // Just today
            totalCals = logsByDate[todayStr]?.cals || 0;
            avgProt = logsByDate[todayStr]?.prot || 0;
            avgCarbs = logsByDate[todayStr]?.carbs || 0;
            avgFats = logsByDate[todayStr]?.fats || 0;
        } 
        else if (view === 'Week') {
            // Last 7 Days
            let totalCarbs = 0;
            let totalFats = 0;
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const val = logsByDate[dStr]?.cals || 0;
                
                chartData.push({
                    label: ['S','M','T','W','T','F','S'][d.getDay()],
                    value: val,
                    metGoal: val >= GOAL
                });
                totalCals += val;
                avgProt += logsByDate[dStr]?.prot || 0;
                totalCarbs += logsByDate[dStr]?.carbs || 0;
                totalFats += logsByDate[dStr]?.fats || 0;
                if (val > highestCalDay) highestCalDay = val;
            }
            avgCals = Math.round(totalCals / 7);
            avgProt = Math.round(avgProt / 7);
            avgCarbs = Math.round(totalCarbs / 7);
            avgFats = Math.round(totalFats / 7);
        } 
        else if (view === 'Month') {
            // Last 30 Days (Visualized as ~15 bars for space, skipping days)
            let count = 0;
            let totalProt = 0;
            let totalCarbs = 0;
            let totalFats = 0;
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];
                const val = logsByDate[dStr]?.cals || 0;
                
                if (i % 2 === 0) { // Show every other day to fit screen
                    chartData.push({
                        label: d.getDate().toString(),
                        value: val,
                        metGoal: val >= GOAL
                    });
                }
                totalCals += val;
                totalProt += logsByDate[dStr]?.prot || 0;
                totalCarbs += logsByDate[dStr]?.carbs || 0;
                totalFats += logsByDate[dStr]?.fats || 0;
                count++;
            }
            avgCals = Math.round(totalCals / 30);
            avgProt = Math.round(totalProt / 30);
            avgCarbs = Math.round(totalCarbs / 30);
            avgFats = Math.round(totalFats / 30);
        }
        else if (view === 'Year') {
            // Group by Month (0-11) with smart labels
            const now = new Date();
            const currentYear = now.getFullYear();
            const monthlyTotals = new Array(12).fill(0);
            const monthYears = new Array(12).fill(currentYear);
            
            Object.keys(logsByDate).forEach(dateKey => {
                const date = new Date(dateKey);
                const month = date.getMonth();
                const year = date.getFullYear();
                
                // Only include this year's data for main calculation
                if (year === currentYear) {
                    monthlyTotals[month] += logsByDate[dateKey].cals;
                }
            });
            
            const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            chartData = monthlyTotals.map((val, i) => ({
                label: monthLabels[i],
                value: val,
                metGoal: val > (GOAL * 25) // ~monthly goal (25 days avg)
            }));
            
            totalCals = monthlyTotals.reduce((a, b) => a + b, 0);
            avgCals = Math.round(totalCals / 365);
        }

        // --- Streak Calculation (using dateKey) ---
        let streak = 0;
        let d = new Date();
        while (true) {
            const dStr = d.toISOString().split('T')[0];
            if (logsByDate[dStr] && logsByDate[dStr].cals > 0) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }

        // --- Meals Today Count ---
        const mealsToday = allLogs.filter(log => 
            (log.dateKey || log.date) === todayStr && log.isEaten
        ).length;

        // --- Monthly Highlights ---
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        let monthlyHighestCal = 0;
        let monthlyHighestProt = 0;
        let monthlyBestDay = '-';
        let bestDayScore = 0;
        
        Object.keys(logsByDate).forEach(dateKey => {
            const date = new Date(dateKey);
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                const dayCals = logsByDate[dateKey].cals;
                const dayProt = logsByDate[dateKey].prot;
                
                if (dayCals > monthlyHighestCal) monthlyHighestCal = dayCals;
                if (dayProt > monthlyHighestProt) monthlyHighestProt = dayProt;
                
                // Best day = highest combined score when goal is met
                if (dayCals >= GOAL && (dayCals + dayProt) > bestDayScore) {
                    bestDayScore = dayCals + dayProt;
                    const d = new Date(dateKey);
                    monthlyBestDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            }
        });
        
        // If no goal-met days, use highest cal day
        if (monthlyBestDay === '-' && monthlyHighestCal > 0) {
            Object.keys(logsByDate).forEach(dateKey => {
                const date = new Date(dateKey);
                if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                    if (logsByDate[dateKey].cals === monthlyHighestCal) {
                        const d = new Date(dateKey);
                        monthlyBestDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                }
            });
        }

        return { chartData, totalCals, avgCals, avgProt, avgCarbs, avgFats, streak, highestCalDay, mealsToday, monthlyHighestCal, monthlyHighestProt, monthlyBestDay };
    }, [allLogs, view, todayKey]);


    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* TITLE */}
                <Text style={styles.pageTitle}>Statistics</Text>
                
                {/* 1. SEGMENTED CONTROL */}
                <SegmentControl selected={view} onChange={setView} />

                {/* 2. MAIN VISUAL */}
                <View style={styles.mainChartSection}>
                    <Text style={styles.chartTitle}>
                        {view === 'Day' ? 'Today\'s Intake' : view + 'ly Trends'}
                    </Text>
                    <Text style={styles.chartSubtitle}>
                        {view === 'Day' ? 'Detailed breakdown' : 'Calorie consistency'}
                    </Text>
                    
                    {view === 'Day' ? (
                         <View style={styles.dayCircleContainer}>
                            <View style={styles.dayCircle}>
                                <Text style={styles.dayCircleValue}>{stats.totalCals}</Text>
                                <Text style={styles.dayCircleLabel}>kcal</Text>
                            </View>
                         </View>
                    ) : (
                        <BarChart data={stats.chartData} />
                    )}
                </View>
            
                {/* 4. STATS GRID */}
                <View style={styles.gridContainer}>
                    <StatGridItem label="Streak" value={`${stats.streak} 🔥`} color="#F59E0B" />
                    <StatGridItem 
                        label={view === 'Day' ? "Meals Today" : "Avg Cals"} 
                        value={view === 'Day' ? stats.mealsToday : stats.avgCals} 
                        color={colors.secondary} 
                    />
                </View>

                {/* MONTHLY HIGHLIGHTS CARD */}
                <View style={styles.highlightsCardShadow}>
                    <LinearGradient
                        colors={['#FF8C42', '#FF512F', '#DD2476']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.highlightsCardGradient}
                    >
                        <Text style={styles.highlightsTitle}>This Month's Highlights</Text>
                        <View style={styles.highlightsRow}>
                            <View style={styles.highlightItem}>
                                <Text style={styles.highlightLabel}>Highest Calories</Text>
                                <Text style={styles.highlightValue}>
                                    {stats.monthlyHighestCal} <Text style={styles.highlightUnit}>kcal</Text>
                                </Text>
                            </View>
                            <View style={styles.highlightItem}>
                                <Text style={styles.highlightLabel}>Highest Protein</Text>
                                <Text style={styles.highlightValue}>
                                    {stats.monthlyHighestProt} <Text style={styles.highlightUnit}>g</Text>
                                </Text>
                            </View>
                        </View>
                        <View style={styles.bestDayRow}>
                            <Feather name="award" size={18} color="#FFF" />
                            <Text style={styles.bestDayLabel}>Best Day:</Text>
                            <Text style={styles.bestDayValue}>{stats.monthlyBestDay}</Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* 5. DETAILS LIST */}
                <Text style={styles.detailsHeader}>MACRONUTRIENTS & INSIGHTS</Text>
                <View style={styles.detailsContainer}>
                    <DetailRow label={view === 'Day' ? "Protein" : "Protein Average"} value={stats.avgProt} unit="g" />
                    <DetailRow label={view === 'Day' ? "Carbs" : "Carbs Average"} value={stats.avgCarbs} unit="g" />
                    <DetailRow label={view === 'Day' ? "Fats" : "Fats Average"} value={stats.avgFats} unit="g" />
                    
                    {view === 'Week' && (
                        <DetailRow label="Highest Calorie Day" value={stats.highestCalDay} unit=" kcal" />
                    )}
                </View>

                {/* 6. DAILY LOGS LINK */}
                <Text style={styles.detailsHeader}>YOUR DAILY LOGS</Text>
                <TouchableOpacity 
                    style={styles.logsLinkContainer} 
                    onPress={() => router.push('/history')}
                    activeOpacity={0.7}
                >
                    <View style={styles.logsLinkContent}>
                        <View>
                            <Text style={styles.logsLinkTitle}>Logs Calendar</Text>
                        </View>
                        <Feather name="chevron-right" size={24} color={colors.textMuted} />
                    </View>
                </TouchableOpacity>

                {/* BOTTOM BUTTON */}
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
                    <Feather name="share" size={20} color="#FFF" style={{marginRight: 8}} />
                    <Text style={styles.actionButtonText}>Share Report</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const createStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, 
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: SPACING.xl,
        marginTop: SPACING.m, // Added margin for better spacing
    },
    scrollContent: {
        padding: SPACING.l,
    },
    
    // SEGMENT CONTROL
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 8,
        padding: 2,
        marginBottom: SPACING.xl,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentActive: {
        backgroundColor: colors.cardHighlight,
    },
    segmentText: {
        color: colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
    },
    segmentTextActive: {
        color: colors.textPrimary,
    },

    // MAIN CHART
    mainChartSection: {
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: SPACING.l,
    },
    dayCircleContainer: {
        width: 150, height: 150, borderRadius: 75, borderWidth: 8, borderColor: colors.primary,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20
    },
    dayCircle: { alignItems: 'center' },
    dayCircleValue: { fontSize: 32, fontWeight: 'bold', color: colors.textPrimary },
    dayCircleLabel: { fontSize: 16, color: colors.textMuted },

    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 150,
        width: '100%',
        paddingHorizontal: 10,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
        gap: 6,
    },
    barFill: {
        width: 6,
        borderRadius: 3,
    },
    barLabel: {
        color: colors.textMuted,
        fontSize: 10,
    },

    // PROGRESS SECTION
    sectionContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: SPACING.m,
        marginBottom: SPACING.m,
    },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    sectionValue: { fontSize: 14, color: colors.textMuted },
    progressBarBg: { height: 8, backgroundColor: colors.cardHighlight, borderRadius: 4, marginTop: 8 },
    progressBarFill: { height: '100%', backgroundColor: colors.textPrimary, borderRadius: 4 },

    // GRID
    gridContainer: {
        flexDirection: 'row',
        gap: SPACING.m,
        marginBottom: SPACING.l,
    },
    statGridItem: {
        flex: 1,
        backgroundColor: '#ADFF2F', // Neon Green
        borderRadius: 24,
        padding: SPACING.s,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
    },
    gridValue: { fontSize: 26, fontWeight: 'bold', color: '#000' },
    gridLabel: { fontSize: 14, color: '#000', marginTop: 6, fontWeight: '600' },

    // MONTHLY HIGHLIGHTS CARD
    highlightsCardShadow: {
        marginBottom: SPACING.xl,
        borderRadius: RADIUS.m,
        shadowColor: '#FF512F',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
        backgroundColor: '#FF512F',
    },
    highlightsCardGradient: {
        borderRadius: RADIUS.m,
        padding: SPACING.m,
        overflow: 'hidden',
    },
    highlightsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: SPACING.m,
    },
    highlightsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.s,
    },
    highlightItem: {
        flex: 1,
        alignItems: 'center',
    },
    highlightLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    highlightValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFF',
    },
    highlightUnit: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    bestDayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.s,
        paddingTop: SPACING.s,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
    },
    bestDayLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.7)',
        marginLeft: 6,
    },
    bestDayValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
        marginLeft: 4,
    },

    // DETAILS LIST
    detailsHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: SPACING.m,
        marginLeft: 4,
    },
    detailsContainer: {
        gap: SPACING.m,
        marginBottom: SPACING.xl,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: SPACING.m,
        backgroundColor: colors.card,
        borderRadius: 12,
    },
    detailLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
    detailValue: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
    divider: {
        height: 1,
        backgroundColor: colors.neon,
    },

    // DAILY LOGS LINK
    logsLinkContainer: {
        backgroundColor: colors.card,
        borderRadius: 12,
        marginBottom: SPACING.xl,
    },
    logsLinkContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
    },
    logsLinkTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    logsLinkSubtitle: {
        fontSize: 13,
        color: colors.textMuted,
        marginTop: 2,
    },

    // BUTTON
    actionButton: {
        backgroundColor: colors.card,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 40,
    },
    actionButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    }
});