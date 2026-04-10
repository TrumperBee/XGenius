'use client';

import { useEffect, useState, useCallback } from 'react';

export interface MatchData {
  id: number;
  date: string;
  league: string;
  league_id: number;
  country: string;
  home_team: {
    id: number;
    name: string;
    short_name: string;
    logo: string;
  };
  away_team: {
    id: number;
    name: string;
    short_name: string;
    logo: string;
  };
  home_score: number | null;
  away_score: number | null;
  status: string;
  status_long: string;
  venue?: string;
}

export interface VerificationResult {
  verified: boolean;
  data_quality: 'high' | 'medium' | 'low' | 'blocked';
  conflicts: string[];
  last_verified_at: string;
  recommended_action: 'show' | 'show_with_warning' | 'block';
}

interface GuardianData {
  success: boolean;
  date: string;
  matches: MatchData[];
  total: number;
  verification: VerificationResult;
}

interface UseGuardianOptions {
  date?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useGuardianFixtures(options: UseGuardianOptions = {}) {
  const { date, autoRefresh = true, refreshInterval = 300000 } = options;
  
  const [data, setData] = useState<GuardianData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      console.log('Fetching fixtures for:', targetDate);
      
      const response = await fetch(`/api/fixtures?date=${targetDate}`);
      const text = await response.text();
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        setError(`API error: ${response.status}`);
        return;
      }
      
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        setError('Invalid JSON from API');
        return;
      }
      
      setData(result);
      
      if (!result.verification?.verified) {
        setError('Data verification failed');
      }
    } catch (e) {
      setError('Failed to fetch fixtures');
      console.error('Guardian fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchFixtures();
    
    if (autoRefresh) {
      const interval = setInterval(fetchFixtures, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchFixtures, autoRefresh, refreshInterval]);

  return {
    data,
    loading,
    error,
    refresh: fetchFixtures,
    matches: data?.matches || [],
    verification: data?.verification,
    isVerified: data?.verification?.verified || false,
    dataQuality: data?.verification?.data_quality || 'blocked'
  };
}

export function getQualityBadge(quality: VerificationResult['data_quality']) {
  const badges = {
    high: { icon: '✅', label: 'Verified', color: 'text-green-500' },
    medium: { icon: '⚠️', label: 'Partial Data', color: 'text-yellow-500' },
    low: { icon: '❌', label: 'Limited Data', color: 'text-red-500' },
    blocked: { icon: '🚫', label: 'Unverified', color: 'text-red-600' }
  };
  return badges[quality];
}

export function formatLastVerified(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
