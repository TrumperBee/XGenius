'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, StatCard, Badge, ProgressBar } from '@/components/ui';
import { TrendingUp, Target, Award, Calendar, BarChart3, Loader2, RefreshCw, Info, CheckCircle2, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Legend } from 'recharts';

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
    confidence_calibration: {
      ranges: {
        range: string;
        min: number;
        max: number;
        predicted: number;
        correct: number;
        accuracy: number;
      }[]
    };
    monthly_trend: {
      months: { month: string; accuracy: number; correct: number; total: number }[]
    };
    last_updated: string;
    next_update: string;
  };
}

export default function StatsPage() {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('/api/stats?action=stats', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      setStatsData(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (e) {
      console.error('Stats fetch error:', e);
    }
    setLoading(false);
  }

  const stats = statsData?.data;

  const sortedLeagues = stats?.league_breakdown
    ? Object.entries(stats.league_breakdown)
        .sort((a, b) => b[1].accuracy - a[1].accuracy)
    : [];

  const bestLeagues = sortedLeagues.slice(0, 3);
  const worstLeagues = sortedLeagues.slice(-3).reverse();

  const calibrationColors: Record<string, string> = {
    '90-100%': 'var(--accent-green)',
    '75-89%': '#22c55e',
    '60-74%': 'var(--accent-yellow)',
    '50-59%': '#f97316',
    'Below 50%': 'var(--accent-red)',
  };

  const isWellCalibrated = (range: string, accuracy: number) => {
    const expectedMin: Record<string, number> = {
      '90-100%': 90,
      '75-89%': 75,
      '60-74%': 60,
      '50-59%': 50,
      'Below 50%': 0,
    };
    const expectedMax: Record<string, number> = {
      '90-100%': 100,
      '75-89%': 89,
      '60-74%': 74,
      '50-59%': 59,
      'Below 50%': 49,
    };
    return accuracy >= expectedMin[range] && accuracy <= expectedMax[range];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Statistics</h1>
          <p className="text-sm text-[var(--text-muted)]">Model performance and analytics</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-80 bg-[var(--bg-card)] rounded-lg animate-pulse" />
          <div className="h-80 bg-[var(--bg-card)] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">Statistics</h1>
          <p className="text-sm text-[var(--text-muted)]">Model performance and analytics</p>
        </div>
        <button 
          onClick={fetchStats} 
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] rounded-lg hover:bg-blue-500/10 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Overall Accuracy" 
          value={`${stats?.overall_accuracy || 0}%`} 
          trend={{ value: stats?.this_month.accuracy || 0, positive: (stats?.this_month.accuracy || 0) >= 60 }}
          icon={Target} 
          subtitle={`${stats?.correct_predictions || 0}/${stats?.total_predictions || 0} correct`}
        />
        <StatCard 
          label="Total Predictions" 
          value={(stats?.total_predictions || 0).toLocaleString()} 
          icon={BarChart3}
          subtitle={`${stats?.this_month.total || 0} this month`}
        />
        <StatCard 
          label="Average ROI" 
          value={`${(stats?.roi.roi || 0) >= 0 ? '+' : ''}${stats?.roi.roi || 0}%`} 
          trend={{ value: stats?.roi.change || 0, positive: (stats?.roi.change || 0) >= 0 }}
          icon={TrendingUp}
          subtitle={`${stats?.roi.unitsStaked || 0} units staked`}
        />
        <StatCard 
          label="Best Confidence" 
          value={`${stats?.confidence_calibration?.ranges[0]?.accuracy || 0}%`} 
          icon={Award}
          subtitle={stats?.confidence_calibration?.ranges[0]?.range || '90-100%'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Accuracy Trend</CardTitle></CardHeader>
          <CardContent>
            {stats?.monthly_trend?.months && stats.monthly_trend.months.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly_trend.months}>
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} domain={[40, 100]} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--accent-blue)" strokeWidth={2} dot={{ fill: 'var(--accent-blue)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                <Info className="w-4 h-4 mr-2" />
                Not enough data for trend analysis
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Day of Week Performance</CardTitle></CardHeader>
          <CardContent>
            {stats?.weekly_performance ? (
              <div className="space-y-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const data = stats.weekly_performance[day];
                  return (
                    <div key={day} className="flex items-center gap-4">
                      <span className="text-sm w-24">{day}</span>
                      <ProgressBar 
                        value={data?.accuracy || 0} 
                        className="flex-1" 
                        color={data?.accuracy >= 70 ? 'var(--accent-green)' : data?.accuracy >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'} 
                      />
                      <span className="text-sm font-mono w-10 text-right">{data?.accuracy || 0}%</span>
                      <span className="text-xs text-[var(--text-muted)] w-16 text-right">
                        {data?.correct || 0}/{data?.total || 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-[var(--text-muted)]">
                <Info className="w-4 h-4 mr-2" />
                No weekly data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>League Breakdown</CardTitle></CardHeader>
        <CardContent>
          {sortedLeagues.length > 0 ? (
            <div className="space-y-4">
              {sortedLeagues.map(([league, data]: [string, any]) => (
                <div key={league} className="flex items-center gap-4">
                  <span className="text-sm w-32">{league}</span>
                  <ProgressBar value={data.accuracy} className="flex-1" color={data.accuracy >= 70 ? 'var(--accent-green)' : data.accuracy >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'} />
                  <span className="text-sm font-mono w-16 text-right">{data.accuracy}%</span>
                  <span className="text-xs text-[var(--text-muted)] w-20">{data.correct}/{data.total} correct</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Info className="w-4 h-4 mr-2 inline" />
              No league data available yet
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Confidence Calibration
            <Badge variant="info" className="text-xs">Beta</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            How well does our confidence score predict actual outcomes? Well calibrated predictions show accuracy within the confidence range.
          </p>
          {stats?.confidence_calibration?.ranges && stats.confidence_calibration.ranges.length > 0 ? (
            <div className="space-y-3">
              {stats.confidence_calibration.ranges.map((bucket) => {
                const calibrated = isWellCalibrated(bucket.range, bucket.accuracy);
                return (
                  <div key={bucket.range} className="flex items-center gap-4">
                    <span className="text-sm w-24">{bucket.range}</span>
                    <ProgressBar 
                      value={bucket.accuracy} 
                      className="flex-1" 
                      color={calibrationColors[bucket.range] || 'var(--accent-blue)'} 
                    />
                    <div className="flex items-center gap-2 w-40">
                      <span className="text-xs text-[var(--text-muted)]">
                        {bucket.predicted > 0 ? `${bucket.correct}/${bucket.predicted}` : 'No data'}
                      </span>
                      {bucket.predicted > 0 && (
                        calibrated 
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : <XCircle className="w-4 h-4 text-yellow-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <Info className="w-4 h-4 mr-2 inline" />
              Stats are building - need more predictions for calibration analysis
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Best Performing Leagues</CardTitle></CardHeader>
          <CardContent>
            {bestLeagues.length > 0 ? (
              <div className="space-y-4">
                {bestLeagues.map(([league, data], index) => (
                  <div key={league} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-green-400 w-8">#{index + 1}</span>
                    <div className="flex-1">
                      <div className="font-medium">{league}</div>
                      <div className="text-sm text-[var(--text-muted)]">{data.correct}/{data.total} correct</div>
                    </div>
                    <span className="text-2xl font-bold text-green-400">{data.accuracy}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <Info className="w-4 h-4 mr-2 inline" />
                No data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Worst Performing Leagues</CardTitle></CardHeader>
          <CardContent>
            {worstLeagues.length > 0 ? (
              <div className="space-y-4">
                {worstLeagues.map(([league, data], index) => (
                  <div key={league} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-red-400 w-8">#{index + 1}</span>
                    <div className="flex-1">
                      <div className="font-medium">{league}</div>
                      <div className="text-sm text-[var(--text-muted)]">{data.correct}/{data.total} correct</div>
                    </div>
                    <span className="text-2xl font-bold text-red-400">{data.accuracy}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <Info className="w-4 h-4 mr-2 inline" />
                No data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-xs text-[var(--text-muted)]">
        Last updated: {lastUpdated || 'Never'}
        {stats?.next_update && (
          <>
            <span className="mx-2">•</span>
            Next update: {new Date(stats.next_update).toLocaleString()}
          </>
        )}
      </div>
    </div>
  );
}
