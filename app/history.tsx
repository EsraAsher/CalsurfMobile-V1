// app/history.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS } from '../.vscode/src/theme';
import { Colors } from '../constants/theme';
import { useTheme } from '../.vscode/src/context/ThemeContext';
import { useFoodLog } from '../hooks/useFoodLog';

const { width } = Dimensions.get('window');

// --- Smart Food Icon Helper ---
const getFoodIcon = (foodName: string): string => {
    const name = (foodName || '').toLowerCase();
    
    // Specific food matches (priority)
    if (name.includes('chicken') || name.includes('breast') || name.includes('wing')) {
        return 'food-drumstick';
    }
    if (name.includes('egg') || name.includes('omelet') || name.includes('omelette')) {
        return 'egg';
    }
    if (name.includes('pasta') || name.includes('spaghetti') || name.includes('noodle') || name.includes('ramen')) {
        return 'noodles';
    }
    if (name.includes('burger') || name.includes('sandwich')) {
        return 'hamburger';
    }
    if (name.includes('pizza')) {
        return 'pizza';
    }
    if (name.includes('rice') || name.includes('curry') || name.includes('bowl')) {
        return 'rice';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('fruit')) {
        return 'food-apple';
    }
    if (name.includes('coffee') || name.includes('latte') || name.includes('espresso')) {
        return 'coffee';
    }
    if (name.includes('salad') || name.includes('veggie') || name.includes('vegetable')) {
        return 'food-variant';
    }
    if (name.includes('steak') || name.includes('beef') || name.includes('meat')) {
        return 'food-steak';
    }
    if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) {
        return 'fish';
    }
    if (name.includes('bread') || name.includes('toast')) {
        return 'bread-slice';
    }
    if (name.includes('cake') || name.includes('dessert') || name.includes('cookie') || name.includes('ice cream')) {
        return 'cupcake';
    }
    
    // Drink category fallback
    if (name.includes('water') || name.includes('juice') || name.includes('milk') || 
        name.includes('shake') || name.includes('smoothie') || name.includes('tea') || 
        name.includes('soda') || name.includes('drink')) {
        return 'cup-water';
    }
    
    // Default - generic food icon
    return 'silverware-fork-knife';
};

// --- Food Item Card Component ---
const AgendaItemCard = React.memo(({ item, isDark }: { item: any; isDark: boolean }) => {
    const iconName = getFoodIcon(item.name);
    
    return (
        <View style={[
            styles.agendaItem,
            { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }
        ]}>
            <View style={styles.agendaItemLeft}>
                <LinearGradient
                    colors={isDark ? ['#2A2A2E', '#1A1A1E'] : ['#E0E0E0', '#D0D0D0']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.foodIcon}
                >
                    <MaterialCommunityIcons name={iconName as any} size={20} color="#2f66ffff" />
                </LinearGradient>
                <View style={styles.agendaItemInfo}>
                    <Text style={[styles.agendaItemName, { color: isDark ? '#FFF' : '#000' }]}>
                        {item.name}
                    </Text>
                    <Text style={[styles.agendaItemMeal, { color: isDark ? '#888' : '#666' }]}>
                        {item.mealType || 'Snack'}
                    </Text>
                </View>
            </View>
            <View style={styles.agendaItemRight}>
                <Text style={[styles.agendaItemCals, { color: isDark ? '#ADFF2F' : '#333' }]}>
                    {item.totalCalories} kcal
                </Text>
                <Text style={[styles.agendaItemProtein, { color: isDark ? '#888' : '#666' }]}>
                    {item.totalProtein}g protein
                </Text>
            </View>
        </View>
    );
});

// --- Empty State Component ---
const EmptyState = React.memo(({ isDark }: { isDark: boolean }) => (
    <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#1E1E1E' : '#F5F5F5' }]}>
            <Feather name="moon" size={28} color={isDark ? '#444' : '#CCC'} />
        </View>
        <Text style={[styles.emptyTitle, { color: isDark ? '#555' : '#999' }]}>
            No logs for this day
        </Text>
        <Text style={[styles.emptySubtitle, { color: isDark ? '#444' : '#BBB' }]}>
            Did you fast? 🤔
        </Text>
    </View>
));

export default function HistoryPage() {
    const { logsByDate, allLogs } = useFoodLog();
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const GOAL = 2000;

    // Selected date state
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    // Get logs for selected date
    const selectedDayLogs = useMemo(() => {
        return allLogs.filter((log: any) => {
            const dateKey = log.dateKey || log.date;
            return dateKey === selectedDate;
        });
    }, [allLogs, selectedDate]);

    // Marked dates for calendar (dots on days with logs)
    const markedDates = useMemo(() => {
        const marks: { [key: string]: any } = {};
        
        logsByDate.forEach((day: any) => {
            marks[day.dateKey] = {
                marked: true,
                dotColor: day.calories >= GOAL ? '#ADFF2F' : '#FF512F',
            };
        });

        // Highlight selected date
        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: '#ADFF2F',
            selectedTextColor: '#000',
        };

        return marks;
    }, [logsByDate, selectedDate, GOAL]);

    // Calendar theme
    const calendarTheme = useMemo(() => ({
        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
        calendarBackground: isDark ? '#1E1E1E' : '#FFFFFF',
        dayTextColor: isDark ? '#FFFFFF' : '#000000',
        monthTextColor: isDark ? '#FFFFFF' : '#000000',
        textSectionTitleColor: isDark ? '#888' : '#666',
        textDisabledColor: isDark ? '#444' : '#CCC',
        selectedDayBackgroundColor: '#ADFF2F',
        selectedDayTextColor: '#000000',
        todayTextColor: '#ADFF2F',
        dotColor: '#ADFF2F',
        arrowColor: '#ADFF2F',
        textDayFontWeight: '500' as const,
        textMonthFontWeight: '600' as const,
        textDayHeaderFontWeight: '600' as const,
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
    }), [isDark]);

    // Format selected date label
    const selectedDateLabel = useMemo(() => {
        const date = new Date(selectedDate + 'T00:00:00');
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }, [selectedDate]);

    // Handle day press
    const handleDayPress = useCallback((day: any) => {
        setSelectedDate(day.dateString);
    }, []);

    // Render food item
    const renderItem = useCallback(({ item }: { item: any }) => (
        <AgendaItemCard item={item} isDark={isDark} />
    ), [isDark]);

    const keyExtractor = useCallback((item: any) => item.id, []);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#131313' : Colors.light.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            
            {/* BLUE AMBIENT GLOW */}
            <LinearGradient
                colors={['rgba(0, 122, 255, 0.15)', 'transparent']}
                style={styles.ambientGlow}
                pointerEvents="none"
            />
            
            {/* HEADER */}
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: isDark ? '#FFF' : Colors.light.text }]}>
                    Logs Calendar
                </Text>
            </View>

            {/* CALENDAR */}
            <View style={[styles.calendarContainer, { backgroundColor: isDark ? '#1E1E1E' : '#FFF' }]}>
                <Calendar
                    current={selectedDate}
                    onDayPress={handleDayPress}
                    markedDates={markedDates}
                    theme={calendarTheme}
                    enableSwipeMonths={true}
                    style={styles.calendar}
                />
            </View>

            {/* SELECTED DATE HEADER */}
            <View style={styles.dateHeader}>
                <View style={styles.dateHeaderLeft}>
                    <Feather name="calendar" size={16} color="#ADFF2F" />
                    <Text style={[styles.dateHeaderText, { color: isDark ? '#FFF' : '#000' }]}>
                        {selectedDateLabel}
                    </Text>
                </View>
                <Text style={[styles.dateHeaderCount, { color: isDark ? '#888' : '#666' }]}>
                    {selectedDayLogs.length} item{selectedDayLogs.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {/* FOOD LOGS LIST */}
            {selectedDayLogs.length === 0 ? (
                <EmptyState isDark={isDark} />
            ) : (
                <FlatList
                    data={selectedDayLogs}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

// Static styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    ambientGlow: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 350,
        zIndex: 0,
    },
    
    // Header Section
    header: {
        paddingHorizontal: SPACING.l,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.s,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: SPACING.s,
        marginTop: SPACING.m,
    },
    
    // Calendar
    calendarContainer: {
        marginHorizontal: SPACING.l,
        borderRadius: RADIUS.m,
        overflow: 'hidden',
        marginBottom: SPACING.m,
    },
    calendar: {
        borderRadius: RADIUS.m,
    },
    
    // Date Header
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
        marginBottom: SPACING.s,
    },
    dateHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.s,
    },
    dateHeaderText: {
        fontSize: 16,
        fontWeight: '600',
    },
    dateHeaderCount: {
        fontSize: 14,
    },
    
    // Food List
    listContent: {
        paddingHorizontal: SPACING.l,
        paddingBottom: SPACING.xl,
    },
    
    // Agenda Item Card
    agendaItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderRadius: RADIUS.m,
    },
    agendaItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    foodIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.m,
    },
    agendaItemInfo: {
        flex: 1,
    },
    agendaItemName: {
        fontSize: 15,
        fontWeight: '600',
    },
    agendaItemMeal: {
        fontSize: 12,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    agendaItemRight: {
        alignItems: 'flex-end',
    },
    agendaItemCals: {
        fontSize: 15,
        fontWeight: '700',
    },
    agendaItemProtein: {
        fontSize: 12,
        marginTop: 2,
    },
    
    // Empty State
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 60,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    emptySubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
});