'use client';

import { MatchWithPrediction, Team } from '@/types';
import { Card, CardContent, Badge, ConfidenceGauge } from '@/components/ui';
import { format } from 'date-fns';
import { Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface MatchCardProps {
  match: MatchWithPrediction;
  homeTeam: Team;
  awayTeam: Team;
  leagueName: string;
}

export function MatchCard({ match, homeTeam, awayTeam, leagueName }: MatchCardProps) {
  const { prediction } = match;

  const getWinnerLabel = (winner: string) => {
    switch (winner) {
      case 'home': return homeTeam.name;
      case 'away': return awayTeam.name;
      case 'draw': return 'Draw';
      default: return 'N/A';
    }
  };

  const getConfidenceTier = (score: number) => {
    if (score >= 80) return { label: 'High', variant: 'success' as const };
    if (score >= 60) return { label: 'Medium', variant: 'warning' as const };
    return { label: 'Low', variant: 'danger' as const };
  };

  const matchDate = new Date(match.start_time);
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  const confidenceTier = prediction ? getConfidenceTier(prediction.confidence_score) : null;

  return (
    <Link href={`/match/${match.id}`}>
      <Card className="hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer group">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="info">{leagueName}</Badge>
              {isLive && <Badge variant="danger">LIVE</Badge>}
              {isFinished && <Badge variant="success">FT</Badge>}
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {format(matchDate, 'HH:mm')}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <div className="text-lg font-bold mb-1">{homeTeam.short_name}</div>
              <div className="text-xs text-[var(--text-muted)]">{homeTeam.name}</div>
            </div>
            
            <div className="px-4">
              {isFinished ? (
                <div className="text-2xl font-bold font-mono">
                  {match.home_score} - {match.away_score}
                </div>
              ) : (
                <div className="text-lg font-mono text-[var(--text-muted)]">vs</div>
              )}
            </div>

            <div className="flex-1 text-center">
              <div className="text-lg font-bold mb-1">{awayTeam.short_name}</div>
              <div className="text-xs text-[var(--text-muted)]">{awayTeam.name}</div>
            </div>
          </div>

          {prediction && (
            <div className="border-t border-[var(--border-color)] pt-3 mt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Prediction</p>
                  <p className="font-semibold">
                    {prediction.predicted_winner === 'draw' 
                      ? 'Draw' 
                      : prediction.predicted_winner === 'home' 
                        ? homeTeam.short_name 
                        : awayTeam.short_name}
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-muted)] mb-1">Probabilities</p>
                    <div className="flex gap-2 text-xs font-mono">
                      <span className="text-[var(--accent-green)]">{prediction.home_probability}%</span>
                      <span className="text-[var(--text-muted)]">{prediction.draw_probability}%</span>
                      <span className="text-[var(--accent-red)]">{prediction.away_probability}%</span>
                    </div>
                  </div>

                  <ConfidenceGauge score={prediction.confidence_score} size="sm" />
                </div>
              </div>

              {prediction.value_bet?.exists && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--accent-yellow)]">
                  <Zap className="w-3 h-3" />
                  <span>Value bet: {prediction.value_bet.bet} (EV +{prediction.value_bet.ev_percent}%)</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface MatchCardCompactProps {
  match: MatchWithPrediction;
  homeTeam: Team;
  awayTeam: Team;
}

export function MatchCardCompact({ match, homeTeam, awayTeam }: MatchCardCompactProps) {
  const { prediction } = match;

  return (
    <div className="flex items-center justify-between p-3 bg-[var(--bg-card)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-blue)]/30 transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-16">{homeTeam.short_name}</span>
        <span className="text-sm text-[var(--text-muted)]">vs</span>
        <span className="text-sm font-medium w-16">{awayTeam.short_name}</span>
      </div>

      {prediction && (
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-[var(--text-muted)]">Pred:</span>{' '}
            <span className="font-medium">
              {prediction.predicted_winner === 'draw' ? 'Draw' : prediction.predicted_winner === 'home' ? homeTeam.short_name : awayTeam.short_name}
            </span>
          </div>
          <ConfidenceGauge score={prediction.confidence_score} size="sm" />
        </div>
      )}
    </div>
  );
}
