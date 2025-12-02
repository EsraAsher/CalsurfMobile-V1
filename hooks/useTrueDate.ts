// hooks/useTrueDate.ts
// True Time Anti-Cheat System
// Prevents users from manipulating streaks/history by changing their phone clock

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { format, parseISO, isThisYear } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

// Safe timezone getter using JavaScript Intl API (no native modules needed)
function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// Types
interface TrueDateContextType {
  isReady: boolean;
  timeOffset: number; // Difference between trusted time and device time in ms
  getTodayDateKey: () => string;
  getCorrectedTime: () => Date;
  formatDateLabel: (dateKey: string) => string;
  timezone: string;
}

// Default context
const TrueDateContext = createContext<TrueDateContextType>({
  isReady: false,
  timeOffset: 0,
  getTodayDateKey: () => new Date().toISOString().split('T')[0],
  getCorrectedTime: () => new Date(),
  formatDateLabel: (dateKey: string) => dateKey,
  timezone: 'UTC',
});

// Trusted time sources (fallback chain)
const TIME_APIS = [
  'https://worldtimeapi.org/api/ip',
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
];

async function fetchTrustedTime(): Promise<number | null> {
  for (const api of TIME_APIS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
      
      const response = await fetch(api, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      // worldtimeapi.org format
      if (data.unixtime) {
        return data.unixtime * 1000; // Convert to milliseconds
      }
      
      // timeapi.io format
      if (data.dateTime) {
        return new Date(data.dateTime + 'Z').getTime();
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${api}:`, error);
      continue;
    }
  }
  return null;
}

export function useTrueDate(): TrueDateContextType {
  const [isReady, setIsReady] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);
  const [timezone, setTimezone] = useState('UTC');

  // Initialize timezone on mount
  useEffect(() => {
    setTimezone(getTimezone());
  }, []);

  // Initialize: Fetch trusted time and calculate offset
  useEffect(() => {
    async function initializeTrueTime() {
      try {
        const deviceTimeAtRequest = Date.now();
        const trustedTime = await fetchTrustedTime();
        
        if (trustedTime !== null) {
          // Account for network latency (rough estimate)
          const networkDelay = (Date.now() - deviceTimeAtRequest) / 2;
          const adjustedTrustedTime = trustedTime + networkDelay;
          const offset = adjustedTrustedTime - Date.now();
          
          // Only apply offset if device clock is off by more than 30 seconds
          if (Math.abs(offset) > 30000) {
            console.log(`[TrueDate] Clock offset detected: ${Math.round(offset / 1000)}s`);
            setTimeOffset(offset);
          } else {
            console.log('[TrueDate] Device clock is accurate');
            setTimeOffset(0);
          }
        } else {
          console.warn('[TrueDate] Could not fetch trusted time, using device time');
          setTimeOffset(0);
        }
      } catch (error) {
        console.error('[TrueDate] Initialization error:', error);
        setTimeOffset(0);
      } finally {
        setIsReady(true);
      }
    }

    initializeTrueTime();
  }, []);

  // Get the corrected current time
  const getCorrectedTime = useCallback((): Date => {
    return new Date(Date.now() + timeOffset);
  }, [timeOffset]);

  // Get today's date key in YYYY-MM-DD format, timezone-aware
  const getTodayDateKey = useCallback((): string => {
    const correctedTime = getCorrectedTime();
    
    try {
      // Convert to user's timezone and format
      return formatInTimeZone(correctedTime, timezone, 'yyyy-MM-dd');
    } catch (error) {
      // Fallback: manual timezone offset calculation
      console.warn('[TrueDate] Timezone formatting failed, using fallback');
      return correctedTime.toISOString().split('T')[0];
    }
  }, [getCorrectedTime, timezone]);

  // Format a date key for display (smart labeling)
  const formatDateLabel = useCallback((dateKey: string): string => {
    try {
      const date = parseISO(dateKey);
      
      if (isThisYear(date)) {
        // Same year: "Nov 30"
        return format(date, 'MMM d');
      } else {
        // Different year: "Nov 30, 2024"
        return format(date, 'MMM d, yyyy');
      }
    } catch (error) {
      return dateKey;
    }
  }, []);

  return {
    isReady,
    timeOffset,
    getTodayDateKey,
    getCorrectedTime,
    formatDateLabel,
    timezone,
  };
}

// Context Provider for app-wide access
export const TrueDateProvider = TrueDateContext.Provider;
export const useTrueDateContext = () => useContext(TrueDateContext);

export default useTrueDate;
