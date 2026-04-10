'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface LoadingState {
  isInitialLoading: boolean;
  isTabLoading: boolean;
  currentTab: string;
  progress: number;
  message: string;
}

interface LoadingContextType extends LoadingState {
  startInitialLoading: (minDuration?: number) => void;
  endInitialLoading: () => void;
  startTabLoading: (tabName: string) => void;
  endTabLoading: () => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

const LOADING_MESSAGES = [
  'Initializing XGenius...',
  'Loading prediction engine...',
  'Connecting to data sources...',
  'Verifying API access...',
  'Preparing neural networks...',
  'Almost ready...',
];

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LoadingState>({
    isInitialLoading: true,
    isTabLoading: false,
    currentTab: '',
    progress: 0,
    message: LOADING_MESSAGES[0],
  });

  const [messageIndex, setMessageIndex] = useState(0);
  const [messageInterval, setMessageInterval] = useState<NodeJS.Timeout | null>(null);

  const startInitialLoading = useCallback((minDuration = 1500) => {
    setState(prev => ({ ...prev, isInitialLoading: true, progress: 0 }));
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      if (currentProgress > 100) currentProgress = 100;
      setState(prev => ({ ...prev, progress: currentProgress }));
    }, 200);

    const messageTimer = setInterval(() => {
      setMessageIndex(prev => {
        const next = prev + 1;
        if (next < LOADING_MESSAGES.length) {
          setState(prev => ({ ...prev, message: LOADING_MESSAGES[next] }));
          return next;
        }
        return prev;
      });
    }, 300);

    setMessageInterval(messageTimer as unknown as NodeJS.Timeout);

    setTimeout(() => {
      clearInterval(interval);
      clearInterval(messageTimer);
      setState(prev => ({ ...prev, progress: 100, message: 'Ready!' }));
      
      setTimeout(() => {
        endInitialLoading();
      }, 300);
    }, minDuration);
  }, []);

  const endInitialLoading = useCallback(() => {
    if (messageInterval) clearInterval(messageInterval);
    setState(prev => ({ 
      ...prev, 
      isInitialLoading: false, 
      progress: 100,
      message: '' 
    }));
  }, [messageInterval]);

  const startTabLoading = useCallback((tabName: string) => {
    setState(prev => ({ 
      ...prev, 
      isTabLoading: true, 
      currentTab: tabName 
    }));
  }, []);

  const endTabLoading = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isTabLoading: false, 
      currentTab: '' 
    }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({ ...prev, progress }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setState(prev => ({ ...prev, message }));
  }, []);

  useEffect(() => {
    const hasVisited = sessionStorage.getItem('xgenius_visited');
    if (hasVisited) {
      setState(prev => ({ ...prev, isInitialLoading: false }));
    } else {
      startInitialLoading(1500);
      sessionStorage.setItem('xgenius_visited', 'true');
    }
  }, []);

  return (
    <LoadingContext.Provider value={{ ...state, startInitialLoading, endInitialLoading, startTabLoading, endTabLoading, setProgress, setMessage }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setLastChecked(new Date());

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastChecked };
}
