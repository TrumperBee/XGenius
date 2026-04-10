'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useLoading } from './LoadingContext';

interface UseTabSwitchOptions {
  tabName: string;
  minLoadingTime?: number;
}

export function useTabSwitch({ tabName, minLoadingTime = 200 }: UseTabSwitchOptions) {
  const { startTabLoading, endTabLoading } = useLoading();
  const abortControllersRef = useRef<AbortController[]>([]);

  const switchToTab = useCallback(async (callback: () => void | Promise<void>) => {
    startTabLoading(tabName);

    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];

    const startTime = Date.now();
    
    try {
      await callback();
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = minLoadingTime - elapsed;
      
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
      
      endTabLoading();
    }
  }, [tabName, minLoadingTime, startTabLoading, endTabLoading]);

  const createAbortController = useCallback(() => {
    const controller = new AbortController();
    abortControllersRef.current.push(controller);
    return controller;
  }, []);

  const cancelAllRequests = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current = [];
  }, []);

  return {
    switchToTab,
    createAbortController,
    cancelAllRequests,
  };
}

interface PullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (typeof window !== 'undefined' && window.scrollY === 0) {
      startYRef.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    if (diff > 0 && typeof window !== 'undefined' && window.scrollY === 0) {
      setIsPulling(true);
      setCanRefresh(diff > threshold);
    }
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (canRefresh) {
      setIsPulling(false);
      setCanRefresh(false);
      try {
        await onRefresh();
      } finally {
        setIsPulling(false);
      }
    }
    setIsPulling(false);
  }, [canRefresh, onRefresh]);

  return {
    isPulling,
    canRefresh,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}

import { useState } from 'react';
