// src/hooks/useFoodLog.ts
import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { db } from '../.vscode/src/config/firebase';
import { useAuth } from '../.vscode/src/context/AuthContext';
import { DailyLogItem } from '../.vscode/src/types/data';
import { useTrueDate } from './useTrueDate';

export function useFoodLog() {
  const { user } = useAuth();
  const { getTodayDateKey, isReady: trueDateReady, formatDateLabel } = useTrueDate();
  const [allLogs, setAllLogs] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get today's date key (anti-cheat protected)
  const todayKey = trueDateReady ? getTodayDateKey() : new Date().toISOString().split('T')[0];

  // 1. Real-time Data Listener - Fetch ALL logs
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/foodLogs`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const fetchedLogs: DailyLogItem[] = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Normalize dateKey for legacy entries that only have 'date'
          dateKey: data.dateKey || data.date,
        } as DailyLogItem;
      });
      setAllLogs(fetchedLogs);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // 2. Filter logs for TODAY only (for dashboard)
  const logs = useMemo(() => {
    return allLogs.filter(log => (log.dateKey || log.date) === todayKey);
  }, [allLogs, todayKey]);

  // 3. Get logs for a specific date range (for stats/history)
  const getLogsForDateRange = (startDate: string, endDate: string): DailyLogItem[] => {
    return allLogs.filter(log => {
      const logDate = log.dateKey || log.date;
      return logDate >= startDate && logDate <= endDate;
    });
  };

  // 4. Get all logs grouped by date (for history)
  const logsByDate = useMemo(() => {
    const groups: Record<string, { 
      date: string; 
      dateKey: string;
      calories: number; 
      protein: number;
      carbs: number;
      fats: number;
      items: DailyLogItem[];
      label: string;
    }> = {};
    
    allLogs.forEach(log => {
      const key = log.dateKey || log.date;
      if (!groups[key]) {
        groups[key] = { 
          date: key, 
          dateKey: key,
          calories: 0, 
          protein: 0,
          carbs: 0,
          fats: 0,
          items: [],
          label: formatDateLabel(key)
        };
      }
      if (log.isEaten) {
        groups[key].calories += log.totalCalories;
        groups[key].protein += log.totalProtein;
        groups[key].carbs += log.totalCarbs || 0;
        groups[key].fats += log.totalFats || 0;
      }
      groups[key].items.push(log);
    });

    // Sort by date descending
    return Object.values(groups).sort((a, b) => 
      new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime()
    );
  }, [allLogs, formatDateLabel]);

  // 5. Add Item with Anti-Cheat dateKey
  const addLog = async (item: Omit<DailyLogItem, 'id' | 'date' | 'dateKey' | 'createdAt'>) => {
    if (!user) return;
    try {
      const dateKey = getTodayDateKey();
      await addDoc(collection(db, `users/${user.uid}/foodLogs`), {
        ...item,
        dateKey, // Anti-cheat: Server-validated date key
        date: dateKey, // Keep for backward compatibility
        createdAt: serverTimestamp(), // Server timestamp for absolute sorting
      });
    } catch (e) {
      console.error("Error adding log: ", e);
    }
  };

  // 6. Toggle Eaten Status
  const toggleEaten = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    const ref = doc(db, `users/${user.uid}/foodLogs`, id);
    await updateDoc(ref, { isEaten: !currentStatus });
  };

  // 7. Delete Item
  const deleteLog = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/foodLogs`, id));
  };

  return { 
    logs,           // Today's logs only (for dashboard)
    allLogs,        // All logs (for history/stats)
    logsByDate,     // Grouped by date with smart labels
    loading, 
    addLog, 
    toggleEaten, 
    deleteLog,
    todayKey,       // Current date key
    getLogsForDateRange,
    formatDateLabel,
  };
}