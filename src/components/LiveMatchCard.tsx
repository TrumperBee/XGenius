'use client';

import { useEffect, useState } from 'react';
import { MatchData, useGuardianFixtures, formatLastVerified } from '@/components/Guardian';
import { Card, CardContent, Badge, ConfidenceGauge, GuardianBadge } from '@/components/ui';
import { generatePrediction } from '@/lib/predictionEngine';
import { format } from 'date-fns';
import { Zap, RefreshCw, Calendar, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface LiveMatchCardProps {
  match: MatchData;
}

export function LiveMatchCard({ match }: LiveMatchCardProps) {
  const [prediction, setPrediction] = useState<any>(null);
  const matchDate = new Date(match.date);
  
  useEffect(() => {
    const pred = generatePrediction({
      homeTeam: { id: match.home_team.id, name: match.home_team.name },
      awayTeam: { id: match.away_team.id, name: match.away_team.name },
      league: { id: match.league_id, name: match.league },
      homeStats: null,
      awayStats: null,
      homeForm: null,
      awayForm: null,
      h2hFixtures: [],
      h2hSummary: { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } }
    });
    setPrediction(pred);
  }, [match]);

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  return (
    <Link href={`/match/${match.id}`}>
      <Card className="hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="info">{match.league}</Badge>
              {isLive && <Badge variant="danger">LIVE</Badge>}
              {isFinished && <Badge variant="success">FT</Badge>}
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {isLive ? match.status_long : format(matchDate, 'HH:mm')}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              {match.home_team.logo && (
                <img src={match.home_team.logo} alt={match.home_team.name} className="w-10 h-10 mx-auto mb-2" />
              )}
              <div className="text-lg font-bold mb-1">{match.home_team.short_name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate max-w-[100px] mx-auto">{match.home_team.name}</div>
            </div>
            
            <div className="px-4">
              {isFinished || isLive ? (
                <div className="text-2xl font-bold font-mono">
                  {match.home_score ?? 0} - {match.away_score ?? 0}
                </div>
              ) : (
                <div className="text-lg font-mono text-[var(--text-muted)]">vs</div>
              )}
            </div>

            <div className="flex-1 text-center">
              {match.away_team.logo && (
                <img src={match.away_team.logo} alt={match.away_team.name} className="w-10 h-10 mx-auto mb-2" />
              )}
              <div className="text-lg font-bold mb-1">{match.away_team.short_name}</div>
              <div className="text-xs text-[var(--text-muted)] truncate max-w-[100px] mx-auto">{match.away_team.name}</div>
            </div>
          </div>

          {prediction && !isFinished && (
            <div className="border-t border-[var(--border-color)] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Prediction</p>
                  <p className="font-semibold">
                    {prediction.predictedWinner === 'draw' 
                      ? 'Draw' 
                      : prediction.predictedWinner === 'home' 
                        ? match.home_team.short_name 
                        : match.away_team.short_name}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Probabilities</p>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="text-green-400">{prediction.homeWin}%</span>
                      <span className="text-gray-400">{prediction.draw}%</span>
                      <span className="text-red-400">{prediction.awayWin}%</span>
                    </div>
                  </div>

                  <ConfidenceGauge score={prediction.confidence} size="sm" />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface LiveMatchesProps {
  date?: string;
}

export function LiveMatches({ date }: LiveMatchesProps) {
  const { data, loading, error, matches, verification, refresh, dataQuality } = useGuardianFixtures({ date });
  const today = date || new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[var(--accent-blue)] mb-3" />
          <p className="text-[var(--text-muted)]">Verifying fixtures...</p>
        </CardContent>
      </Card>
    );
  }

  const errorMessage = error || (matches.length === 0 ? 'No matches found for this date' : 'Data verification failed. Please check back later.');

  if (error || dataQuality === 'blocked' || matches.length === 0) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-10 h-10 mx-auto text-yellow-500 mb-3" />
          <p className="text-lg font-medium mb-2">No matches available</p>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            {errorMessage}
          </p>
          <button 
            onClick={refresh}
            className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const formattedDate = new Date(today + 'T12:00:00Z').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[var(--text-muted)]" />
          <span className="font-medium">{formattedDate}</span>
        </div>
        <div className="flex items-center gap-3">
          <GuardianBadge quality={dataQuality} lastVerified={verification?.last_verified_at ? formatLastVerified(verification.last_verified_at) : undefined} />
          <button onClick={refresh} className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {verification?.recommended_action === 'show_with_warning' && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
          Some data may be outdated. Predictions are estimates.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {matches.map(match => (
          <LiveMatchCard key={match.id} match={match} />
        ))}
      </div>

      {matches.length === 0 && (
        <div className="text-center py-8 text-[var(--text-muted)]">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No matches scheduled for this date</p>
        </div>
      )}
    </div>
  );
}
