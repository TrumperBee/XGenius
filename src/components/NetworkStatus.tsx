'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useNetworkStatus } from './LoadingContext';

interface NetworkStatusBannerProps {
  children: React.ReactNode;
}

export function NetworkStatusBanner({ children }: NetworkStatusBannerProps) {
  const { isOnline, lastChecked } = useNetworkStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
    } else {
      const timer = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    window.location.reload();
  }, []);

  if (isOnline && !showBanner) {
    return <>{children}</>;
  }

  return (
    <React.Fragment>
      <div 
        className={`fixed top-16 left-0 right-0 z-40 transition-transform duration-300 ${
          showBanner ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className={`flex items-center justify-center gap-3 px-4 py-2 ${
          isOnline ? 'bg-green-500/20 border-b border-green-500/30' : 'bg-red-500/20 border-b border-red-500/30'
        }`}>
          {isOnline ? (
            <React.Fragment>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-400">Connection restored</span>
              <span className="text-xs text-[var(--text-muted)]">
                Last checked: {lastChecked?.toLocaleTimeString()}
              </span>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-400">You are offline</span>
              <span className="text-xs text-[var(--text-muted)]">Showing cached data</span>
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors disabled:opacity-50 ml-2"
              >
                <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
                Retry
              </button>
            </React.Fragment>
          )}
        </div>
      </div>
      <div className={!isOnline ? 'pt-12' : ''}>
        {children}
      </div>
    </React.Fragment>
  );
}

export function NetworkStatusIndicator() {
  const { isOnline, lastChecked } = useNetworkStatus();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div 
      className="relative flex items-center gap-2"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
      <span className="text-xs text-[var(--text-muted)] hidden lg:inline">
        {isOnline ? 'Online' : 'Offline'}
      </span>
      
      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-2 shadow-lg whitespace-nowrap z-50">
          <p className="text-xs text-[var(--text-secondary)]">
            {isOnline ? 'Connected to XGenius' : 'Using cached data'}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {lastChecked ? `Last check: ${lastChecked.toLocaleTimeString()}` : 'Checking...'}
          </p>
        </div>
      )}
    </div>
  );
}

interface TimeoutHandlerProps {
  children: React.ReactNode;
  timeout?: number;
}

export function TimeoutHandler({ children, timeout = 60000 }: TimeoutHandlerProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasTimedOut(true);
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  const handleRetry = useCallback(() => {
    setRetrying(true);
    window.location.reload();
  }, []);

  if (hasTimedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-[var(--text-muted)]" />
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Request timed out</h3>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            We could not load the data. Please check your connection.
          </p>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-blue)] hover:bg-blue-600 text-white text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
