'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge, StatCard } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator, TimeoutHandler } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { usePullToRefresh } from '@/components/useTabSwitch';
import { Calendar, Trophy, RefreshCw, CheckCircle2, XCircle, Target, TrendingUp } from 'lucide-react';

interface ResultMatch {
  id: number;
  date: string;
  league: string;
  home_team: { id: number; name: string; short: string; logo: string };
  away_team: { id: number; name: string; short: string; logo: string };
  home_score: number;
  away_score: number;
  prediction: {
    predictedWinner: 'home' | 'draw' | 'away';
    correctScore: string;
    homeWin: number;
    draw: number;
    awayWin: number;
    confidence: number;
    overUnder: 'over' | 'under';
    btts: 'yes' | 'no';
  };
  evaluation: {
    winnerCorrect: boolean;
    scoreCorrect: boolean;
    overUnderCorrect: boolean;
    bttsCorrect: boolean;
    accuracy: number;
  };
  verified: boolean;
}

interface ResultsData {
  success: boolean;
  date: string;
  has_results: boolean;
  matches: ResultMatch[];
  leagues: string[];
  total: number;
  verified: boolean;
  stats: {
    correct: number;
    total: number;
    accuracy: number;
    winnerAccuracy: number;
  };
  friendly_message?: {
    title: string;
    body: string;
    explanation: string;
  };
}

export default function YesterdayPage() {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
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

  const getWinnerLabel = (winner: 'home' | 'draw' | 'away', homeShort: string, awayShort: string) => {
    if (winner === 'home') return homeShort;
    if (winner === 'away') return awayShort;
    return 'Draw';
  };

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
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-[var(--bg-tertiary)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {data?.has_results && data.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-green-500/30">
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-green-400">{data.stats.winnerAccuracy}%</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Winner Accuracy</p>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/30">
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold text-blue-400">{data.stats.accuracy}%</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Overall Accuracy</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold">{data.stats.correct}/{data.stats.total}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Correct Predictions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <p className="text-3xl font-bold">{data.total}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Total Matches</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {!data?.has_results ? (
                <Card className="border-yellow-500/30 bg-yellow-500/5">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                    <p className="text-lg font-medium mb-2">{data?.friendly_message?.title || 'No Matches Yesterday'}</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                      {data?.friendly_message?.body || 'No competitive matches were played in Top 5 European Leagues yesterday.'}
                    </p>
                    {data?.friendly_message?.explanation && (
                      <p className="text-xs text-[var(--text-muted)] mt-4 italic">
                        {data.friendly_message.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  {data?.leagues?.map(league => {
                    const leagueMatches = data.matches.filter((m: ResultMatch) => m.league === league);
                    const leagueCorrect = leagueMatches.filter((m: ResultMatch) => m.evaluation.winnerCorrect).length;
                    
                    return (
                      <Card key={league}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle>{league}</CardTitle>
                            <span className="text-sm text-[var(--text-muted)]">
                              {leagueCorrect}/{leagueMatches.length} correct
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {leagueMatches.map((match: ResultMatch) => (
                              <div key={match.id}>
                                <div 
                                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 cursor-pointer transition-colors"
                                  onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                                >
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <img src={match.home_team.logo} alt={match.home_team.name} className="w-6 h-6 object-contain" />
                                      <span className="font-medium text-sm truncate">{match.home_team.short}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                      <span className={`font-mono text-lg font-bold ${match.evaluation.winnerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {match.home_score}
                                      </span>
                                      <span className="text-[var(--text-muted)]">-</span>
                                      <span className={`font-mono text-lg font-bold ${match.evaluation.winnerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                        {match.away_score}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span className="font-medium text-sm truncate">{match.away_team.short}</span>
                                      <img src={match.away_team.logo} alt={match.away_team.name} className="w-6 h-6 object-contain" />
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 ml-4">
                                    {match.evaluation.winnerCorrect ? (
                                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                                    ) : (
                                      <XCircle className="w-6 h-6 text-red-400" />
                                    )}
                                    {match.evaluation.scoreCorrect && (
                                      <Badge variant="success" className="text-xs">Exact</Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {expandedMatch === match.id && (
                                  <div className="mt-2 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                                    <div className="grid md:grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="text-xs text-[var(--text-muted)] uppercase mb-2">Our Prediction</h4>
                                        <div className="space-y-2">
                                          <div className="flex justify-between">
                                            <span className="text-sm">Winner:</span>
                                            <span className="text-sm font-medium">
                                              {getWinnerLabel(match.prediction.predictedWinner, match.home_team.short, match.away_team.short)}
                                              {' '}({match.prediction.predictedWinner === 'home' ? match.prediction.homeWin : match.prediction.predictedWinner === 'away' ? match.prediction.awayWin : match.prediction.draw}%)
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">Correct Score:</span>
                                            <span className={`text-sm font-medium ${match.evaluation.scoreCorrect ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                                              {match.prediction.correctScore}
                                              {match.evaluation.scoreCorrect && ' ✓'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">Over/Under 2.5:</span>
                                            <span className={`text-sm font-medium ${match.evaluation.overUnderCorrect ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                                              {match.prediction.overUnder === 'over' ? 'Over' : 'Under'} 2.5
                                              {match.evaluation.overUnderCorrect && ' ✓'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">BTTS:</span>
                                            <span className={`text-sm font-medium ${match.evaluation.bttsCorrect ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                                              {match.prediction.btts === 'yes' ? 'Yes' : 'No'}
                                              {match.evaluation.bttsCorrect && ' ✓'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">Confidence:</span>
                                            <span className="text-sm font-medium text-blue-400">
                                              {match.prediction.confidence}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h4 className="text-xs text-[var(--text-muted)] uppercase mb-2">Result Analysis</h4>
                                        <div className="space-y-2">
                                          <div className="flex justify-between">
                                            <span className="text-sm">Winner:</span>
                                            <span className={`text-sm font-medium ${match.evaluation.winnerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                              {match.home_score > match.away_score ? match.home_team.short : match.home_score < match.away_score ? match.away_team.short : 'Draw'}
                                              {match.evaluation.winnerCorrect ? ' ✓' : ' ✗'}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">Total Goals:</span>
                                            <span className="text-sm font-medium">
                                              {match.home_score + match.away_score}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-sm">Accuracy:</span>
                                            <span className={`text-sm font-bold ${match.evaluation.accuracy >= 75 ? 'text-green-400' : match.evaluation.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                              {Math.round(match.evaluation.accuracy)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </NetworkStatusBanner>
      <TabLoadingOverlay />
    </TimeoutHandler>
  );
}
