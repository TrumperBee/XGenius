'use client';

import React, { useEffect, useState } from 'react';
import { useLoading } from './LoadingContext';

function FootballAnimation() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-8">
      <div className="absolute inset-0 border-4 border-[var(--accent-blue)]/30 rounded-full animate-ping" />
      <div className="absolute inset-2 border-4 border-[var(--accent-blue)]/50 rounded-full animate-ping delay-75" />
      <div className="absolute inset-4 bg-[var(--accent-blue)] rounded-full flex items-center justify-center animate-spin">
        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 2v20M2 12h20" strokeDasharray="3 3" />
        </svg>
      </div>
    </div>
  );
}

function SimpleSpinner() {
  return (
    <div className="w-12 h-12 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
  );
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function InitialLoadingScreen() {
  const { isInitialLoading, progress, message } = useLoading();
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  const mobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  useEffect(() => {
    if (!isInitialLoading && isVisible) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--bg-primary)] transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[var(--accent-blue)] to-purple-500 bg-clip-text text-transparent">
          XGenius
        </h1>
        <p className="text-sm text-[var(--text-muted)] mb-6">AI-Powered Football Predictions</p>
        
        {mobile ? <SimpleSpinner /> : <FootballAnimation />}
        
        <div className="w-64 mx-auto mb-4">
          <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--accent-blue)] to-purple-500 transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[var(--text-muted)]">{Math.round(progress)}%</span>
          </div>
        </div>
        
        <p className="text-sm text-[var(--text-muted)] animate-pulse">{message}</p>
      </div>
    </div>
  );
}

export function TabLoadingOverlay() {
  const { isTabLoading, currentTab } = useLoading();

  if (!isTabLoading) return null;

  return (
    <div className="fixed inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm z-40 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[var(--accent-blue)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[var(--text-muted)]">Loading {currentTab}...</p>
      </div>
    </div>
  );
}
