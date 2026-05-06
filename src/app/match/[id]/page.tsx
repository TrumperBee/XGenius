'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { NetworkStatusBanner } from '@/components/NetworkStatus';
import { MatchPoll } from '@/components/MatchPoll';
import { Loader2, Calendar, Trophy, TrendingUp, Zap, Target, BarChart3, Clock, AlertCircle, RefreshCw, CheckCircle2, XCircle, Info, HelpCircle, ChevronDown, ChevronUp, History } from 'lucide-react';
import { generatePrediction, type Prediction, type TeamStats, type FormFixture, type H2HFxture } from '@/lib/predictionEngine';

interface Fixture {
  id: number;
  date: string;
  league: string;
  league_id: number;
  country: string;
  home_team: { id: number; name: string; short: string; short_name: string; logo: string };
  away_team: { id: number; name: string; short: string; short_name: string; logo: string };
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface H2HData {
  success: boolean;
  fixtures: Array<{
    id: number;
    date: string;
    competition: string;
    home_score: number;
    away_score: number;
    home_team: { name: string };
    away_team: { name: string };
  }>;
  summary: {
    total: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    goals: { home: number; away: number };
  };
  has_history: boolean;
  verification?: { verified: boolean; data_quality: string };
}

function DataUnavailable({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-[var(--text-muted)] text-sm">
      <AlertCircle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}

export default function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const matchId = parseInt(id);
  
  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [h2hData, setH2hData] = useState<H2HData | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);
  const [homeForm, setHomeForm] = useState<{form: string[], summary: any, fixtures: any[]} | null>(null);
  const [awayForm, setAwayForm] = useState<{form: string[], summary: any, fixtures: any[]} | null>(null);
  const [homeStats, setHomeStats] = useState<TeamStats | null>(null);
  const [awayStats, setAwayStats] = useState<TeamStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showWhy, setShowWhy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const insights = useMemo(() => {
    return prediction?.insights || [];
  }, [prediction]);

  const fetchMatchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/fixtures?date=${today}&days=7`, {
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json();
      
      const allFixtures = (data.matches || []) as Fixture[];
      const found = allFixtures.find(f => f.id === matchId);
      
      if (found) {
        setFixture(found);
        setLastUpdated(new Date().toLocaleString());
      } else {
        setError('Match not found');
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Failed to load match details');
    }
    setLoading(false);
  }, [matchId]);

  const fetchAllData = useCallback(async () => {
    if (!fixture) return;
    
    setStatsLoading(true);
    setFormLoading(true);
    setH2hLoading(true);

    const currentYear = new Date().getFullYear();
    const season = String(new Date().getMonth() >= 7 ? currentYear : currentYear - 1);

    try {
      const [homeStatsRes, awayStatsRes, homeFormRes, awayFormRes, h2hRes, homeInjuriesRes, awayInjuriesRes] = await Promise.allSettled([
        fetch(`/api/team-stats?teamId=${fixture.home_team.id}&leagueId=${fixture.league_id}&season=${season}`),
        fetch(`/api/team-stats?teamId=${fixture.away_team.id}&leagueId=${fixture.league_id}&season=${season}`),
        fetch(`/api/team-form?teamId=${fixture.home_team.id}`),
        fetch(`/api/team-form?teamId=${fixture.away_team.id}`),
        fetch(`/api/h2h?team1=${fixture.home_team.id}&team2=${fixture.away_team.id}`),
        fetch(`/api/injuries?teamId=${fixture.home_team.id}`),
        fetch(`/api/injuries?teamId=${fixture.away_team.id}`)
      ]);

      let hStats: TeamStats | null = null;
      let aStats: TeamStats | null = null;
      let hForm: any = null;
      let aForm: any = null;
      let h2h: any = null;
      let homeInjured: string[] = [];
      let awayInjured: string[] = [];

      if (homeStatsRes.status === 'fulfilled' && homeStatsRes.value.ok) {
        const data = await homeStatsRes.value.json();
        if (data.success) {
          hStats = {
            teamId: data.teamId,
            teamName: data.teamName,
            leagueId: data.leagueId,
            leagueName: data.leagueName,
            gamesPlayed: data.gamesPlayed,
            wins: data.wins,
            draws: data.draws,
            losses: data.losses,
            goalsFor: data.goalsFor,
            goalsAgainst: data.goalsAgainst,
            goalDifference: data.goalDifference,
            cleanSheets: data.cleanSheets,
            homeRecord: data.homeRecord,
            awayRecord: data.awayRecord,
            form: data.form,
            position: data.position
          };
        }
      }

      if (awayStatsRes.status === 'fulfilled' && awayStatsRes.value.ok) {
        const data = await awayStatsRes.value.json();
        if (data.success) {
          aStats = {
            teamId: data.teamId,
            teamName: data.teamName,
            leagueId: data.leagueId,
            leagueName: data.leagueName,
            gamesPlayed: data.gamesPlayed,
            wins: data.wins,
            draws: data.draws,
            losses: data.losses,
            goalsFor: data.goalsFor,
            goalsAgainst: data.goalsAgainst,
            goalDifference: data.goalDifference,
            cleanSheets: data.cleanSheets,
            homeRecord: data.homeRecord,
            awayRecord: data.awayRecord,
            form: data.form,
            position: data.position
          };
        }
      }

      if (homeFormRes.status === 'fulfilled' && homeFormRes.value.ok) {
        const data = await homeFormRes.value.json();
        if (data.success) {
          hForm = { form: data.form || [], summary: data.summary, fixtures: data.fixtures || [] };
        }
      }

      if (awayFormRes.status === 'fulfilled' && awayFormRes.value.ok) {
        const data = await awayFormRes.value.json();
        if (data.success) {
          aForm = { form: data.form || [], summary: data.summary, fixtures: data.fixtures || [] };
        }
      }

      if (h2hRes.status === 'fulfilled' && h2hRes.value.ok) {
        const data = await h2hRes.value.json();
        h2h = data;
      }

      if (homeInjuriesRes.status === 'fulfilled' && homeInjuriesRes.value.ok) {
        const data = await homeInjuriesRes.value.json();
        homeInjured = data.injuries?.map((i: any) => i.playerName) || [];
      }

      if (awayInjuriesRes.status === 'fulfilled' && awayInjuriesRes.value.ok) {
        const data = await awayInjuriesRes.value.json();
        awayInjured = data.injuries?.map((i: any) => i.playerName) || [];
      }

      setHomeStats(hStats);
      setAwayStats(aStats);
      setHomeForm(hForm);
      setAwayForm(aForm);
      setH2hData(h2h || {
        success: false,
        has_history: false,
        fixtures: [],
        summary: { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } }
      });

      const formToFixtures = (fixtures: any[]): FormFixture[] => {
        return fixtures.map((f: any) => ({
          id: f.id,
          date: f.date,
          league: f.league || '',
          opponent: f.opponent || '',
          isHome: f.isHome,
          home_score: f.home_score || 0,
          away_score: f.away_score || 0,
          goalsFor: f.goalsFor || 0,
          goalsAgainst: f.goalsAgainst || 0,
          result: f.result || 'D'
        }));
      };

      const h2hFixtures: H2HFxture[] = (h2h?.fixtures || []).map((f: any) => ({
        id: f.id,
        date: f.date,
        competition: f.competition || f.league || '',
        home_team: { name: f.home_team?.name || '' },
        away_team: { name: f.away_team?.name || '' },
        home_score: f.home_score || 0,
        away_score: f.away_score || 0
      }));

      const pred = generatePrediction({
        homeTeam: { id: fixture.home_team.id, name: fixture.home_team.name },
        awayTeam: { id: fixture.away_team.id, name: fixture.away_team.name },
        league: { id: fixture.league_id, name: fixture.league },
        homeStats: hStats,
        awayStats: aStats,
        homeForm: hForm ? formToFixtures(hForm.fixtures) : null,
        awayForm: aForm ? formToFixtures(aForm.fixtures) : null,
        h2hFixtures,
        h2hSummary: h2h?.summary || { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } },
        injuries: { homeInjured, awayInjured }
      });

      setPrediction(pred);
    } catch (e) {
      console.error('Data fetch error:', e);
    }

    setStatsLoading(false);
    setFormLoading(false);
    setH2hLoading(false);
  }, [fixture]);

  useEffect(() => {
    fetchMatchData();
  }, [fetchMatchData]);

  useEffect(() => {
    if (fixture) {
      fetchAllData();
    }
  }, [fixture, fetchAllData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !fixture) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50 text-[var(--text-muted)]" />
        <p className="text-lg font-medium mb-2">Match Not Found</p>
        <p className="text-sm text-[var(--text-muted)]">
          This match may not be available.
        </p>
        <a href="/fixtures" className="text-blue-400 hover:underline mt-4 block">
          View all fixtures
        </a>
      </div>
    );
  }

  const matchDate = new Date(fixture.date);
  const isLive = fixture.status === 'live';
  const isFinished = fixture.status === 'finished';

  return (
    <NetworkStatusBanner>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="info">{fixture.league}</Badge>
              {isLive && <Badge variant="danger">LIVE</Badge>}
              {isFinished && <Badge variant="success">FINISHED</Badge>}
            </div>
            <h1 className="text-2xl font-bold">{fixture.home_team.name} vs {fixture.away_team.name}</h1>
          </div>
          <div className="text-right text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {matchDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Match Prediction
                {prediction && (
                  <Badge variant={prediction.dataQuality === 'high' ? 'success' : prediction.dataQuality === 'medium' ? 'warning' : 'danger'} className="ml-2">
                    {prediction.dataQuality.toUpperCase()} QUALITY DATA
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div className="text-center flex-1">
                  <img src={fixture.home_team.logo} alt={fixture.home_team.name} className="w-16 h-16 mx-auto mb-2" />
                  <p className="font-bold">{fixture.home_team.short}</p>
                  {homeStats && <p className="text-xs text-[var(--text-muted)]">{homeStats.position ? `${homeStats.position}th` : ''}</p>}
                </div>
                <div className="text-center px-8">
                  <div className="text-4xl font-bold text-[var(--text-muted)]">vs</div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Kick-off</p>
                </div>
                <div className="text-center flex-1">
                  <img src={fixture.away_team.logo} alt={fixture.away_team.name} className="w-16 h-16 mx-auto mb-2" />
                  <p className="font-bold">{fixture.away_team.short}</p>
                  {awayStats && <p className="text-xs text-[var(--text-muted)]">{awayStats.position ? `${awayStats.position}th` : ''}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className={`p-4 rounded-lg text-center border ${prediction?.predictedWinner === 'home' ? 'bg-green-500/20 border-green-500/40' : 'bg-green-500/10 border-green-500/20'}`}>
                  <div className={`text-3xl font-bold ${prediction?.predictedWinner === 'home' ? 'text-green-400' : 'text-green-500/70'}`}>{prediction?.homeWin ?? '--'}%</div>
                  <div className="text-sm text-[var(--text-muted)]">{fixture.home_team.short} Win</div>
                  {prediction?.predictedWinner === 'home' && <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-green-400" />}
                </div>
                <div className={`p-4 rounded-lg text-center border ${prediction?.predictedWinner === 'draw' ? 'bg-gray-500/20 border-gray-500/40' : 'bg-gray-500/10 border-gray-500/20'}`}>
                  <div className={`text-3xl font-bold ${prediction?.predictedWinner === 'draw' ? 'text-gray-300' : 'text-gray-500/70'}`}>{prediction?.draw ?? '--'}%</div>
                  <div className="text-sm text-[var(--text-muted)]">Draw</div>
                  {prediction?.predictedWinner === 'draw' && <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-gray-300" />}
                </div>
                <div className={`p-4 rounded-lg text-center border ${prediction?.predictedWinner === 'away' ? 'bg-red-500/20 border-red-500/40' : 'bg-red-500/10 border-red-500/20'}`}>
                  <div className={`text-3xl font-bold ${prediction?.predictedWinner === 'away' ? 'text-red-400' : 'text-red-500/70'}`}>{prediction?.awayWin ?? '--'}%</div>
                  <div className="text-sm text-[var(--text-muted)]">{fixture.away_team.short} Win</div>
                  {prediction?.predictedWinner === 'away' && <CheckCircle2 className="w-4 h-4 mx-auto mt-1 text-red-400" />}
                </div>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-muted)]">Expected Goals</span>
                  <span className="text-lg font-bold">
                    <span className="text-green-400">{prediction?.expectedHomeGoals ?? '--'}</span>
                    {' - '}
                    <span className="text-red-400">{prediction?.expectedAwayGoals ?? '--'}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Goal Range</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {prediction?.totalGoals ? (
                      <>
                        {Math.max(0, Math.floor(prediction.totalGoals - 0.8)).toFixed(0)}-{Math.ceil(prediction.totalGoals + 0.8).toFixed(0)} Goals
                      </>
                    ) : '--'}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">
                    Expected: ~{prediction?.totalGoals?.toFixed(1) || '--'} goals
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border-transparent">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-blue-400">{prediction?.confidence ?? '--'}%</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Over/Under 2.5</div>
                  <div className="text-2xl font-bold">
                    {prediction?.overUnder === 'over' ? (
                      <span className="text-blue-400">Over {prediction?.overUnderProb}%</span>
                    ) : (
                      <span className="text-yellow-400">Under {prediction?.overUnderProb}%</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Both Teams Score</div>
                  <div className="text-2xl font-bold">
                    {prediction?.btts === 'yes' ? (
                      <span className="text-purple-400">Yes {prediction?.bttsProb}%</span>
                    ) : (
                      <span className="text-gray-400">No {prediction?.bttsProb}%</span>
                    )}
                  </div>
                </div>
              </div>

              {prediction && prediction.dataQuality !== 'high' && prediction.missingData.length > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Limited data: {prediction.missingData.join(', ')}</span>
                  </div>
                </div>
              )}

              {prediction && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => setShowWhy(!showWhy)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-400">Why this prediction?</span>
                    </div>
                    {showWhy ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
                  </button>
                  
                  {showWhy && (
                    <div className="mt-4 space-y-3">
                      <ul className="space-y-2">
                        {insights.map((insight, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Zap className="w-3 h-3 text-yellow-400 mt-1 flex-shrink-0" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {homeStats && awayStats && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                            <div className="text-[var(--text-muted)] mb-1">Attack Strength</div>
                            <div className="font-bold text-green-400">{prediction.homeAttackStrength} vs {prediction.awayAttackStrength}</div>
                          </div>
                          <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                            <div className="text-[var(--text-muted)] mb-1">Defense Strength</div>
                            <div className="font-bold text-red-400">{prediction.homeDefenseStrength} vs {prediction.awayDefenseStrength}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Recent Form
                {formLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={fixture.home_team.logo} alt={fixture.home_team.name} className="w-6 h-6 object-contain" />
                        <span className="font-medium">{fixture.home_team.short}</span>
                      </div>
                      {homeForm?.summary ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {homeForm.summary.wins}W-{homeForm.summary.draws}D-{homeForm.summary.losses}L
                        </span>
                      ) : statsLoading ? (
                        <span className="text-xs text-[var(--text-muted)]">Loading...</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No data</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {homeForm && homeForm.form.length > 0 ? (
                        homeForm.form.slice(0, 5).map((result, i) => (
                          <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                            result === 'W' ? 'bg-green-500/30 text-green-400' : 
                            result === 'D' ? 'bg-yellow-500/30 text-yellow-400' : 
                            'bg-red-500/30 text-red-400'
                          }`}>
                            {result}
                          </span>
                        ))
                      ) : statsLoading ? (
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => <div key={i} className="w-7 h-7 rounded bg-[var(--bg-tertiary)] animate-pulse" />)}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No recent form data</span>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={fixture.away_team.logo} alt={fixture.away_team.name} className="w-6 h-6 object-contain" />
                        <span className="font-medium">{fixture.away_team.short}</span>
                      </div>
                      {awayForm?.summary ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          {awayForm.summary.wins}W-{awayForm.summary.draws}D-{awayForm.summary.losses}L
                        </span>
                      ) : statsLoading ? (
                        <span className="text-xs text-[var(--text-muted)]">Loading...</span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No data</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {awayForm && awayForm.form.length > 0 ? (
                        awayForm.form.slice(0, 5).map((result, i) => (
                          <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                            result === 'W' ? 'bg-green-500/30 text-green-400' : 
                            result === 'D' ? 'bg-yellow-500/30 text-yellow-400' : 
                            'bg-red-500/30 text-red-400'
                          }`}>
                            {result}
                          </span>
                        ))
                      ) : statsLoading ? (
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => <div key={i} className="w-7 h-7 rounded bg-[var(--bg-tertiary)] animate-pulse" />)}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">No recent form data</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          </div>

          <div className="space-y-6">
            {prediction && fixture && (
              <MatchPoll
                matchId={matchId}
                homeTeam={fixture.home_team.name}
                awayTeam={fixture.away_team.name}
                homeShort={fixture.home_team.short}
                awayShort={fixture.away_team.short}
                homeLogo={fixture.home_team.logo}
                awayLogo={fixture.away_team.logo}
                league={fixture.league}
                prediction={{
                  predictedWinner: prediction.predictedWinner,
                  totalGoals: prediction.totalGoals,
                  confidence: prediction.confidence,
                  homeGoals: prediction.homeGoals,
                  awayGoals: prediction.awayGoals,
                  overUnder: prediction.overUnder,
                  btts: prediction.btts,
                }}
              />
            )}
          </div>
        </div>

        {homeStats && awayStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Team Comparison — {homeStats.leagueName === awayStats.leagueName ? homeStats.leagueName : 'Season'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-color)]">
                      <th className="text-left py-2 pr-4 text-[var(--text-muted)]">Statistic</th>
                      <th className="text-center py-2 px-2">{fixture.home_team.short}</th>
                      <th className="text-center py-2 px-2">{fixture.away_team.short}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['League Position', homeStats.position ? `${homeStats.position}th` : '—', awayStats.position ? `${awayStats.position}th` : '—'],
                      ['Played', homeStats.gamesPlayed, awayStats.gamesPlayed],
                      ['Wins', homeStats.wins, awayStats.wins],
                      ['Draws', homeStats.draws, awayStats.draws],
                      ['Losses', homeStats.losses, awayStats.losses],
                      ['Goals Scored', `${homeStats.goalsFor} (${homeStats.gamesPlayed > 0 ? (homeStats.goalsFor / homeStats.gamesPlayed).toFixed(2) : '0'}/game)`, `${awayStats.goalsFor} (${awayStats.gamesPlayed > 0 ? (awayStats.goalsFor / awayStats.gamesPlayed).toFixed(2) : '0'}/game)`],
                      ['Goals Conceded', `${homeStats.goalsAgainst} (${homeStats.gamesPlayed > 0 ? (homeStats.goalsAgainst / homeStats.gamesPlayed).toFixed(2) : '0'}/game)`, `${awayStats.goalsAgainst} (${awayStats.gamesPlayed > 0 ? (awayStats.goalsAgainst / awayStats.gamesPlayed).toFixed(2) : '0'}/game)`],
                      ['Goal Difference', homeStats.goalDifference > 0 ? `+${homeStats.goalDifference}` : homeStats.goalDifference, awayStats.goalDifference > 0 ? `+${awayStats.goalDifference}` : awayStats.goalDifference],
                      ['Clean Sheets', `${homeStats.cleanSheets} (${homeStats.gamesPlayed > 0 ? Math.round(homeStats.cleanSheets / homeStats.gamesPlayed * 100) : 0}%)`, `${awayStats.cleanSheets} (${awayStats.gamesPlayed > 0 ? Math.round(awayStats.cleanSheets / awayStats.gamesPlayed * 100) : 0}%)`],
                    ].map(([label, homeVal, awayVal], i) => (
                      <tr key={i} className="border-b border-[var(--border-color)]/30">
                        <td className="py-2 pr-4 text-[var(--text-muted)]">{label}</td>
                        <td className="py-2 px-2 text-center font-medium">{homeVal}</td>
                        <td className="py-2 px-2 text-center font-medium">{awayVal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Head-to-Head History
              {h2hLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {h2hLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : h2hData && h2hData.has_history && h2hData.fixtures.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-blue-500/10 text-center">
                    <p className="text-3xl font-bold text-blue-400">{h2hData.summary.home_wins}</p>
                    <p className="text-sm text-[var(--text-muted)]">{fixture.home_team.short} Wins</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-500/10 text-center">
                    <p className="text-3xl font-bold text-gray-400">{h2hData.summary.draws}</p>
                    <p className="text-sm text-[var(--text-muted)]">Draws</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-500/10 text-center">
                    <p className="text-3xl font-bold text-red-400">{h2hData.summary.away_wins}</p>
                    <p className="text-sm text-[var(--text-muted)]">{fixture.away_team.short} Wins</p>
                  </div>
                </div>
                
                <div className="text-center mb-4 text-sm text-[var(--text-muted)]">
                  Total Goals: {h2hData.summary.goals.home} - {h2hData.summary.goals.away}
                  {h2hData.fixtures.length > 0 && (
                    <span className="ml-2">
                      • BTTS: {h2hData.fixtures.filter((m: any) => m.home_score > 0 && m.away_score > 0).length}/{h2hData.fixtures.length}
                      • Over 2.5: {h2hData.fixtures.filter((m: any) => m.home_score + m.away_score > 2.5).length}/{h2hData.fixtures.length}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {h2hData.fixtures.slice(0, 10).map((match) => (
                    <div key={match.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                      <span className="text-xs text-[var(--text-muted)] w-32 truncate">{match.competition}</span>
                      <div className="flex items-center gap-4 flex-1 justify-center">
                        <span className="w-24 text-right text-sm truncate">{match.home_team.name}</span>
                        <span className="font-mono font-bold px-3 py-1 rounded bg-[var(--bg-secondary)]">
                          {match.home_score} - {match.away_score}
                        </span>
                        <span className="w-24 text-sm truncate">{match.away_team.name}</span>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] w-20 text-right">
                        {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
                <p className="font-medium text-sm mb-1">No H2H Data</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {h2hData?.verification?.data_quality === 'blocked' 
                    ? 'API unavailable - check team form below'
                    : 'These teams may not have met recently.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recent Form (All Competitions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <img src={fixture.home_team.logo} alt="" className="w-5 h-5" />
                  {fixture.home_team.name}
                </h4>
                {homeForm?.summary ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Record (Last 10)</span>
                      <span className="font-medium">
                        <span className="text-green-400">{homeForm.summary.wins}W</span>-{homeForm.summary.draws}D-<span className="text-red-400">{homeForm.summary.losses}L</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Goals Scored</span>
                      <span>{homeForm.summary.goalsFor} ({homeForm.summary.total > 0 ? (homeForm.summary.goalsFor / homeForm.summary.total).toFixed(1) : '0'} avg)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Goals Conceded</span>
                      <span>{homeForm.summary.goalsAgainst} ({homeForm.summary.total > 0 ? (homeForm.summary.goalsAgainst / homeForm.summary.total).toFixed(1) : '0'} avg)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Clean Sheets</span>
                      <span>{homeForm.summary.cleanSheets}</span>
                    </div>
                  </div>
                ) : statsLoading ? (
                  <div className="space-y-2 text-sm">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-4 rounded bg-[var(--bg-secondary)] animate-pulse" />)}
                  </div>
                ) : (
                  <DataUnavailable message="Form data unavailable" />
                )}
              </div>
              
              <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <img src={fixture.away_team.logo} alt="" className="w-5 h-5" />
                  {fixture.away_team.name}
                </h4>
                {awayForm?.summary ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Record (Last 10)</span>
                      <span className="font-medium">
                        <span className="text-green-400">{awayForm.summary.wins}W</span>-{awayForm.summary.draws}D-<span className="text-red-400">{awayForm.summary.losses}L</span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Goals Scored</span>
                      <span>{awayForm.summary.goalsFor} ({awayForm.summary.total > 0 ? (awayForm.summary.goalsFor / awayForm.summary.total).toFixed(1) : '0'} avg)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Goals Conceded</span>
                      <span>{awayForm.summary.goalsAgainst} ({awayForm.summary.total > 0 ? (awayForm.summary.goalsAgainst / awayForm.summary.total).toFixed(1) : '0'} avg)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Clean Sheets</span>
                      <span>{awayForm.summary.cleanSheets}</span>
                    </div>
                  </div>
                ) : statsLoading ? (
                  <div className="space-y-2 text-sm">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-4 rounded bg-[var(--bg-secondary)] animate-pulse" />)}
                  </div>
                ) : (
                  <DataUnavailable message="Form data unavailable" />
                )}
              </div>
            </div>
            
            {homeForm?.fixtures && homeForm.fixtures.length > 0 && (
              <div className="mt-6">
                <h5 className="text-sm font-medium mb-3">{fixture.home_team.short} Recent Matches</h5>
                <div className="space-y-2">
                  {homeForm.fixtures.slice(0, 5).map((match: any) => (
                    <div key={match.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-secondary)] text-sm">
                      <span className="text-xs text-[var(--text-muted)] w-20">{match.isHome ? 'Home' : 'Away'}</span>
                      <span className="text-xs truncate flex-1">{match.opponent}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        match.result === 'W' ? 'bg-green-500/20 text-green-400' :
                        match.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {match.result}
                      </span>
                      <span className="font-mono text-xs w-16 text-right">
                        {match.home_score}-{match.away_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {awayForm?.fixtures && awayForm.fixtures.length > 0 && (
              <div className="mt-6">
                <h5 className="text-sm font-medium mb-3">{fixture.away_team.short} Recent Matches</h5>
                <div className="space-y-2">
                  {awayForm.fixtures.slice(0, 5).map((match: any) => (
                    <div key={match.id} className="flex items-center justify-between p-2 rounded bg-[var(--bg-secondary)] text-sm">
                      <span className="text-xs text-[var(--text-muted)] w-20">{match.isHome ? 'Home' : 'Away'}</span>
                      <span className="text-xs truncate flex-1">{match.opponent}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        match.result === 'W' ? 'bg-green-500/20 text-green-400' :
                        match.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {match.result}
                      </span>
                      <span className="font-mono text-xs w-16 text-right">
                        {match.home_score}-{match.away_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-[var(--text-muted)]">
          Last updated: {lastUpdated}
          <button onClick={fetchAllData} className="ml-2 text-blue-400 hover:underline flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>
    </NetworkStatusBanner>
  );
}
