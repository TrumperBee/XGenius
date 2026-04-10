'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, StatCard, Badge, GuardianBadge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { SkeletonGrid } from '@/components/Skeleton';
import { NetworkStatusBanner, NetworkStatusIndicator, TimeoutHandler } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { usePullToRefresh } from '@/components/useTabSwitch';
import { Calendar, Trophy, RefreshCw } from 'lucide-react';

interface ResultsData {
  success: boolean;
  date: string;
  matches: any[];
  leagues: string[];
  total: number;
  verified: boolean;
  friendly_message?: {
    title: string;
    subtitle: string;
    suggestions: string[];
  };
}

export default function YesterdayPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isTabLoading, startTabLoading, endTabLoading } = useLoading();

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      const response = await fetch(`/api/results?date=${dateStr}`);
      const result = await response.json();
      setData(result);
    } catch (e) {
      console.error('Results fetch error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchResults();
    setIsRefreshing(false);
  }, [fetchResults]);

  const pullToRefresh = usePullToRefresh({ onRefresh: handleRefresh });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = yesterday.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <TimeoutHandler>
      <NetworkStatusBanner>
        <div className="space-y-6" {...pullToRefresh.touchHandlers}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Yesterday&apos;s Results</h1>
              <p className="text-sm text-[var(--text-muted)]">{formattedDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <NetworkStatusIndicator />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 min-w-[48px] min-h-[48px] flex items-center justify-center"
                aria-label="Refresh results"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loading || isTabLoading ? (
            <SkeletonGrid count={4} />
          ) : (
            <>
              {data?.verified && (
                <div className="flex items-center gap-2">
                  <Badge variant="success">✓ Verified</Badge>
                  <span className="text-xs text-[var(--text-muted)]">From 2+ sources</span>
                </div>
              )}

              {data?.total === 0 || !data?.verified ? (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="py-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
                    <p className="text-lg font-medium mb-2">{data?.friendly_message?.title || 'No matches in Top 5 Leagues'}</p>
                    <p className="text-sm text-[var(--text-muted)]">{data?.friendly_message?.subtitle}</p>
                    {data?.friendly_message?.suggestions && (
                      <div className="mt-4 text-sm text-[var(--text-muted)]">
                        {data.friendly_message.suggestions.map((s: string, i: number) => (
                          <p key={i}>• {s}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <StatCard label="Total Matches" value={data.total} icon={Calendar} />
                  
                  {data.leagues?.map(league => {
                    const leagueMatches = data.matches.filter((m: any) => m.league === league);
                    return (
                      <Card key={league}>
                        <CardHeader>
                          <CardTitle>{league}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {leagueMatches.map((match: any) => (
                              <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{match.home_team.short}</span>
                                  <span className="font-mono text-lg font-bold">{match.home_score} - {match.away_score}</span>
                                  <span className="font-medium">{match.away_team.short}</span>
                                </div>
                                {match.verified && <Badge variant="success">✓</Badge>}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              <GuardianBadge quality={data?.verified ? 'high' : 'low'} lastVerified={new Date().toISOString()} />
            </>
          )}
        </div>
      </NetworkStatusBanner>
      <TabLoadingOverlay />
    </TimeoutHandler>
  );
}
