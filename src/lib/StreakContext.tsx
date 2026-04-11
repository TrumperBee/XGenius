'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface StreakData {
  currentStreak: number;
  bestStreak: number;
  lastPredictionCorrect: boolean | null;
  totalCorrect: number;
  totalPredictions: number;
  lastUpdated: string;
}

interface StreakContextType {
  streak: StreakData;
  recordPrediction: (correct: boolean) => void;
  resetStreak: () => void;
  isLoading: boolean;
}

const defaultStreak: StreakData = {
  currentStreak: 0,
  bestStreak: 0,
  lastPredictionCorrect: null,
  totalCorrect: 0,
  totalPredictions: 0,
  lastUpdated: new Date().toISOString(),
};

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const STORAGE_KEY = 'xgenius_streak';

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState<StreakData>(defaultStreak);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setStreak(parsed);
        } catch (e) {
          console.error('Error parsing streak data:', e);
        }
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(streak));
    }
  }, [streak, isLoading]);

  const recordPrediction = useCallback((correct: boolean) => {
    setStreak(prev => {
      const newStreak = correct 
        ? prev.currentStreak + 1 
        : 0;
      
      return {
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastPredictionCorrect: correct,
        totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
        totalPredictions: prev.totalPredictions + 1,
        lastUpdated: new Date().toISOString(),
      };
    });
  }, []);

  const resetStreak = useCallback(() => {
    setStreak(defaultStreak);
  }, []);

  return (
    <StreakContext.Provider value={{ streak, recordPrediction, resetStreak, isLoading }}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
}
