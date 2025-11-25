// src/components/StatsOverview.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../.vscode/src/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - (SPACING.l * 2);

// --- MOCK DATA GENERATORS (For Demo Visuals) ---
const generateWeekData = () => Array.from({ length: 7 }, (_, i) => ({
    label: ['M','T','W','T','F','S','S'][i],
    value: Math.floor(Math.random() * (2400 - 1500) + 1500), // Random cals 1500-2400
    metGoal: Math.random() > 0.4
}));

const generateMonthData = () => Array.from({ length: 30 }, (_, i) => ({
    value: Math.floor(Math.random() * (2500 - 1200) + 1200),
    metGoal: Math.random() > 0.5
}));

const generateYearData = () => Array.from({ length: 12 }, (_, i) => ({
    label: ['J','F','M','A','M','J','J','A','S','O','N','D'][i],
    value: Math.floor(Math.random() * (2200 - 1800) + 1800),
    metGoal: Math.random() > 0.3
}));

// --- SUB-COMPONENTS ---

const TabButton = ({ title, active, onPress }: any) => (
    <TouchableOpacity 
        style={[styles.tab, active && styles.tabActive]} 
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
    </TouchableOpacity>
);

const NutrientRow = ({ label, value, goal, color, icon, unit = 'g' }: any) => (
  <View style={styles.nutrientRow}>
    <View style={styles.nutrientHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Feather name={icon} size={16} color={COLORS.textMuted} />
            <Text style={styles.nutrientLabel}>{label}</Text>
        </View>
        <Text style={styles.nutrientValue}>
            <Text style={{color: COLORS.textPrimary, fontWeight: 'bold'}}>{value}{unit}</Text> 
            <Text style={{color: COLORS.textMuted}}> / {goal}{unit}</Text>
        </Text>
    </View>
    <View style={styles.barBg}>
        <LinearGradient
            colors={[color, color]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={[styles.barFill, { width: `${Math.min((value / goal) * 100, 100)}%` }]}
        />
    </View>
  </View>
);

const SummaryStat = ({ label, value, sub }: any) => (
    <View style={styles.statBox}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
);

const BarChart = ({ data, maxVal = 2500 }: any) => (
    <View style={styles.chartContainer}>
        {data.map((item: any, index: number) => (
            <View key={index} style={styles.barColumn}>
                <View style={styles.barTrack}>
                    <LinearGradient
                         colors={item.metGoal ? [COLORS.success, '#22c55e'] : [COLORS.cardHighlight, COLORS.cardHighlight]}
                         style={[styles.bar, { height: `${(item.value / maxVal) * 100}%` }]}
                    />
                </View>
                {item.label && <Text style={styles.barLabel}>{item.label}</Text>}
            </View>
        ))}
    </View>
);

// --- MAIN COMPONENT ---

export default function StatsOverview({ totals, goals }: any) {
  const [view, setView] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day');

  // Pre-generate data for stability
  const [weekData] = useState(generateWeekData());
  const [monthData] = useState(generateMonthData());
  const [yearData] = useState(generateYearData());

  const renderContent = () => {
    switch (view) {
        case 'Day':
            return (
                <View style={styles.contentContainer}>
                    <View style={styles.grid}>
                        <NutrientRow label="Protein" value={totals.protein} goal={goals.protein} color={COLORS.secondary} icon="zap" />
                        <NutrientRow label="Calories" value={totals.calories} goal={goals.calories} color={COLORS.primary} icon="activity" unit="" />
                        {/* Future metrics placeholder */}
                        <NutrientRow label="Carbs" value={Math.round(totals.calories * 0.12)} goal={250} color="#F59E0B" icon="layers" />
                        <NutrientRow label="Fats" value={Math.round(totals.calories * 0.03)} goal={80} color={COLORS.accent} icon="droplet" />
                        <NutrientRow label="Fiber" value={12} goal={30} color="#10B981" icon="wind" />
                    </View>
                </View>
            );
        case 'Week':
            const weekTotal = weekData.reduce((a, b) => a + b.value, 0);
            return (
                <View style={styles.contentContainer}>
                    <View style={styles.statsRow}>
                        <SummaryStat label="Total Cals" value={(weekTotal/1000).toFixed(1) + 'k'} />
                        <SummaryStat label="Avg Daily" value={Math.round(weekTotal / 7)} />
                        <SummaryStat label="Best Day" value="Friday" sub="2100 cal" />
                    </View>
                    <View style={styles.chartWrapper}>
                        <BarChart data={weekData} maxVal={2600} />
                    </View>
                </View>
            );
        case 'Month':
             const monthTotal = monthData.reduce((a, b) => a + b.value, 0);
             return (
                <View style={styles.contentContainer}>
                    <View style={styles.statsRow}>
                        <SummaryStat label="Monthly Avg" value={Math.round(monthTotal / 30)} />
                        <SummaryStat label="On Track" value="18 Days" sub="Goal Met" />
                    </View>
                    {/* Trend Line Visualization using thin bars */}
                    <View style={styles.trendChart}>
                        {monthData.map((d, i) => (
                             <View key={i} style={[styles.trendBar, { height: `${(d.value/3000)*100}%`, backgroundColor: d.metGoal ? COLORS.primary : COLORS.cardHighlight }]} />
                        ))}
                    </View>
                    <Text style={styles.chartCaption}>30 Day Trend</Text>
                </View>
             );
        case 'Year':
             const yearTotal = yearData.reduce((a, b) => a + b.value, 0);
             return (
                <View style={styles.contentContainer}>
                     <View style={styles.statsRow}>
                        <SummaryStat label="Total Year" value={(yearTotal/1000).toFixed(0) + 'k'} />
                        <SummaryStat label="Best Month" value="Nov" />
                    </View>
                    <View style={styles.chartWrapper}>
                        <BarChart data={yearData} maxVal={2600} />
                    </View>
                </View>
             );
    }
  };

  return (
    <View style={styles.container}>
      {/* Segmented Control */}
      <View style={styles.tabsContainer}>
         {['Day', 'Week', 'Month', 'Year'].map((t) => (
             <TabButton 
                key={t} 
                title={t} 
                active={view === t} 
                onPress={() => setView(t as any)} 
             />
         ))}
      </View>

      {/* Dynamic Content */}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.l,
    padding: SPACING.m,
    marginTop: SPACING.s,
    marginBottom: SPACING.l,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardHighlight,
    borderRadius: RADIUS.m,
    padding: 4,
    marginBottom: SPACING.l,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.s,
  },
  tabActive: {
    backgroundColor: COLORS.card, // or a slightly lighter color
    shadowColor: '#000',
    shadowOffset: {width:0, height:1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  tabText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  tabTextActive: {
    color: COLORS.textPrimary,
  },
  // Content
  contentContainer: {
    gap: SPACING.m,
  },
  grid: {
    gap: SPACING.m,
  },
  // Nutrient Row
  nutrientRow: { gap: 6 },
  nutrientHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  nutrientLabel: { color: COLORS.textSecondary, fontSize: 14 },
  nutrientValue: { fontSize: 14 },
  barBg: { height: 6, backgroundColor: COLORS.cardHighlight, borderRadius: 3, width: '100%', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  
  // Summary Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  statBox: {
    backgroundColor: COLORS.cardHighlight,
    padding: 12,
    borderRadius: RADIUS.m,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: { color: COLORS.textMuted, fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  statSub: { color: COLORS.success, fontSize: 10, marginTop: 2 },

  // Charts
  chartWrapper: {
    height: 120,
    marginTop: SPACING.s,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    gap: 6,
  },
  barTrack: {
    width: 8,
    height: '85%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  barLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
  },

  // Trend Chart (Month)
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    marginTop: SPACING.s,
    paddingHorizontal: 4,
  },
  trendBar: {
    width: 4,
    borderRadius: 2,
  },
  chartCaption: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 8,
  },
});