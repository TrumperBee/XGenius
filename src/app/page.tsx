'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, StatCard, Badge, ProgressBar, GuardianBadge, Button } from '@/components/ui';
import { TrendingUp, Target, Award, Calendar, ChevronRight, Loader2, AlertTriangle, Star, Zap, Clock, ExternalLink, RefreshCw, WifiOff } from 'lucide-react';
import Link from 'next/link';

interface FixturesData {
  success: boolean;
  date: string;
  days: number;
  fixtures_by_date: Record<string, any[]>;
  total_matches: number;
  friendly_message?: {
    title: string;
    subtitle: string;
    suggestions: string[];
  };
  verification: {
    verified: boolean;
    data_quality: string;
    last_verified_at: string;
  };
}

interface StatsData {
  success: boolean;
  data: {
    total_predictions: number;
    correct_predictions: number;
    overall_accuracy: number;
    yesterday: { accuracy: number; correct: number; total: number; change: number };
    this_week: { accuracy: number; correct: number; total: number; change: number };
    this_month: { accuracy: number; correct: number; total: number };
    roi: { roi: number; unitsWon: number; unitsStaked: number; change: number };
    weekly_performance: { [key: string]: { accuracy: number; correct: number; total: number } };
    league_breakdown: { [key: string]: { accuracy: number; correct: number; total: number } };
    high_confidence_predictions: any[];
    last_updated: string;
    next_update: string;
    source: string;
  };
}

interface HighConfidenceMatch {
  match_id: number;
  home_team: string;
  away_team: string;
  competition: string;
  predicted_winner: string;
  confidence: number;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  correct_score: string;
  match_date: string;
}

function ConnectionError({ onRetry }: { onRetry: () => void }) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onRetry();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onRetry]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
        <p className="text-gray-400 mb-6">Unable to load data. Please check your connection and try again.</p>
        <Button onClick={onRetry} variant="glow" className="mb-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Now
        </Button>
        <p className="text-xs text-gray-500">Auto-retry in {countdown} seconds...</p>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] animate-pulse">
            <div className="p-5 h-full flex flex-col justify-between">
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
              <div className="h-6 bg-[var(--bg-tertiary)] rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <div className="h-48 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] animate-pulse" />
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-64 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] animate-pulse" />
        <div className="h-64 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] animate-pulse" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorFixtures, setErrorFixtures] = useState(false);
  const [errorStats, setErrorStats] = useState(false);

  const fetchFixtures = useCallback(async () => {
    setErrorFixtures(false);
    setLoadingFixtures(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/fixtures?date=${today}&days=1`, {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      setFixturesData(data);
    } catch (e) {
      console.error('Fixtures fetch error:', e);
      setErrorFixtures(true);
    }
    setLoadingFixtures(false);
  }, []);

  const fetchStats = useCallback(async () => {
    setErrorStats(false);
    setLoadingStats(true);
    try {
      const response = await fetch('/api/stats?action=stats', {
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      setStatsData(data);
    } catch (e) {
      console.error('Stats fetch error:', e);
      setErrorStats(true);
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => {
    fetchFixtures();
    fetchStats();
  }, [fetchFixtures, fetchStats]);

  const matches = fixturesData?.fixtures_by_date ? 
    Object.values(fixturesData.fixtures_by_date).flat() : [];

  const stats = statsData?.data;
  
  const sortedWeekly = stats?.weekly_performance 
    ? Object.entries(stats.weekly_performance)
        .sort((a, b) => {
          const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          return order.indexOf(a[0]) - order.indexOf(b[0]);
        })
        .map(([day, data]) => ({ day: day.substring(0, 3), ...data }))
    : [];

  const sortedLeagues = stats?.league_breakdown
    ? Object.entries(stats.league_breakdown)
        .sort((a, b) => b[1].accuracy - a[1].accuracy)
        .slice(0, 5)
    : [];

  const highConfidenceMatches = stats?.high_confidence_predictions || [];
  const isLoading = loadingFixtures || loadingStats;
  const hasError = errorFixtures || errorStats;

  if (hasError) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">XGenius</h1>
              <p className="text-sm text-[var(--text-muted)]">Autonomous Football Prediction Engine</p>
            </div>
            <GuardianBadge quality="low" />
          </div>
          <PageSkeleton />
        </div>
        <ConnectionError onRetry={() => { fetchFixtures(); fetchStats(); }} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">XGenius</h1>
          <p className="text-sm text-[var(--text-muted)]">Autonomous Football Prediction Engine</p>
        </div>
        <GuardianBadge quality={fixturesData?.verification?.verified ? 'high' : 'low'} />
      </div>

      {isLoading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] animate-pulse">
              <div className="p-5 h-full flex flex-col justify-between">
                <div className="h-3 bg-[var(--bg-tertiary)] rounded w-1/2" />
                <div className="h-6 bg-[var(--bg-tertiary)] rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            label="Yesterday Accuracy" 
            value={`${stats.yesterday.accuracy}%`} 
            trend={{ value: stats.yesterday.change, positive: stats.yesterday.change >= 0 }} 
            icon={Target} 
            subtitle={stats.yesterday.total > 0 ? `${stats.yesterday.correct}/${stats.yesterday.total} correct` : 'No matches'}
          />
          <StatCard 
            label="This Week" 
            value={`${stats.this_week.accuracy}%`} 
            trend={{ value: stats.this_week.change, positive: stats.this_week.change >= 0 }} 
            icon={TrendingUp} 
            subtitle={stats.this_week.total > 0 ? `${stats.this_week.correct}/${stats.this_week.total} correct` : 'No matches'}
          />
          <StatCard 
            label="Total Predictions" 
            value={stats.total_predictions.toLocaleString()} 
            icon={Award}
            subtitle={`${stats.correct_predictions} correct (${stats.overall_accuracy}%)`}
          />
          <StatCard 
            label="ROI" 
            value={`${stats.roi.roi >= 0 ? '+' : ''}${stats.roi.roi}%`} 
            trend={{ value: stats.roi.change, positive: stats.roi.change >= 0 }} 
            icon={Calendar} 
            subtitle={`${stats.roi.unitsStaked} units staked`}
          />
        </div>
      ) : null}

      {highConfidenceMatches.length > 0 && (
        <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                High Confidence Predictions
                <Badge variant="warning">{highConfidenceMatches.length} picks</Badge>
              </CardTitle>
              <Link href="/dashboard?filter=high-confidence" className="text-xs text-yellow-400 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {highConfidenceMatches.slice(0, 3).map((match: any) => (
                <Link 
                  key={match.match_id} 
                  href={`/match/${match.match_id}`}
                  className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-yellow-500/10 border border-yellow-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(234,179,8,0.2)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="info" className="text-xs">{match.competition}</Badge>
                    <span className="text-xs text-yellow-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {match.confidence}%
                    </span>
                  </div>
                  <div className="text-sm font-medium mb-1">
                    {match.home_team} vs {match.away_team}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={match.predicted_winner === 'home' ? 'text-green-400' : match.predicted_winner === 'away' ? 'text-red-400' : 'text-gray-400'}>
                      {match.predicted_winner === 'home' ? match.home_team : match.predicted_winner === 'away' ? match.away_team : 'Draw'} Win
                    </span>
                    <span className="text-[var(--text-muted)]">{match.correct_score}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingFixtures ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-green-400" />
            <span className="text-sm text-[var(--text-muted)]">Loading matches...</span>
          </div>
        </div>
      ) : matches.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Matches ({matches.length})</CardTitle>
              <Link href="/today" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {matches.slice(0, 4).map((match: any) => (
                <Link 
                  key={match.id} 
                  href={`/match/${match.id}`}
                  className="p-4 rounded-lg bg-[var(--bg-tertiary)] hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 flex items-center justify-between transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="font-medium text-sm">{match.home_team.short_name}</p>
                      <p className="text-xs text-[var(--text-muted)]">vs</p>
                      <p className="font-medium text-sm">{match.away_team.short_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="info">{match.league}</Badge>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {new Date(match.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-transparent">
          <CardContent className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
            <p className="text-lg font-medium mb-2">{fixturesData?.friendly_message?.title || 'No matches today'}</p>
            <p className="text-sm text-[var(--text-muted)]">{fixturesData?.friendly_message?.subtitle}</p>
            <Link href="/today" className="mt-4 inline-block px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg text-sm hover:from-green-500 hover:to-emerald-400 transition-all">
              Check upcoming matches
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i} className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedWeekly.map((d: any) => (
                  <div key={d.day} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-muted)] w-8">{d.day}</span>
                    <ProgressBar 
                      value={d.accuracy} 
                      className="flex-1" 
                      color={d.accuracy >= 70 ? 'var(--accent-green)' : d.accuracy >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'} 
                    />
                    <span className="text-xs font-mono w-10 text-right">{d.accuracy}%</span>
                    <span className="text-xs text-[var(--text-muted)] w-16 text-right">{d.correct}/{d.total}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>League Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-8 bg-[var(--bg-tertiary)] rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {sortedLeagues.map(([league, data]: [string, any]) => (
                  <div key={league} className="flex items-center justify-between">
                    <span className="text-sm">{league}</span>
                    <span className={`font-bold ${
                      data.accuracy >= 70 ? 'text-green-400' : 
                      data.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {data.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.last_updated && (
        <div className="text-center text-xs text-[var(--text-muted)]">
          Last updated: {new Date(stats.last_updated).toLocaleString()}
          <span className="mx-2">•</span>
          Next update: {new Date(stats.next_update).toLocaleString()}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/today" className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-blue-500/10 text-center transition-all duration-300 hover:-translate-y-0.5">
              <Calendar className="w-5 h-5 mx-auto mb-1 text-blue-400" />
              <span className="text-xs">Today's Picks</span>
            </Link>
            <Link href="/analyze" className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-green-500/10 text-center transition-all duration-300 hover:-translate-y-0.5">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-green-400" />
              <span className="text-xs">Analyze</span>
            </Link>
            <Link href="/yesterday" className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-yellow-500/10 text-center transition-all duration-300 hover:-translate-y-0.5">
              <Award className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
              <span className="text-xs">Yesterday</span>
            </Link>
            <Link href="/dashboard" className="p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-purple-500/10 text-center transition-all duration-300 hover:-translate-y-0.5">
              <Target className="w-5 h-5 mx-auto mb-1 text-purple-400" />
              <span className="text-xs">Dashboard</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
