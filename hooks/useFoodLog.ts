// src/hooks/useFoodLog.ts
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../.vscode/src/config/firebase';
import { useAuth } from '../.vscode/src/context/AuthContext';
import { DailyLogItem } from '../.vscode/src/types/data';

export function useFoodLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Real-time Data Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, `users/${user.uid}/logs`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const fetchedLogs: DailyLogItem[] = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as DailyLogItem));
      setLogs(fetchedLogs);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // 2. Add Item
  const addLog = async (item: Omit<DailyLogItem, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/logs`), {
        ...item,
        createdAt: new Date().toISOString() // Timestamp for sorting
      });
    } catch (e) {
      console.error("Error adding log: ", e);
    }
  };

  // 3. Toggle Eaten Status
  const toggleEaten = async (id: string, currentStatus: boolean) => {
    if (!user) return;
    const ref = doc(db, `users/${user.uid}/logs`, id);
    await updateDoc(ref, { isEaten: !currentStatus });
  };

  // 4. Delete Item
  const deleteLog = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, `users/${user.uid}/logs`, id));
  };

  return { logs, loading, addLog, toggleEaten, deleteLog };
}