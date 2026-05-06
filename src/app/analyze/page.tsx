'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator, TimeoutHandler } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { Search, Loader2, Trophy, X, BarChart3, Target } from 'lucide-react';
import { generatePrediction, type Prediction, type TeamStats, type FormFixture, type H2HFxture } from '@/lib/predictionEngine';

interface Team {
  id: number;
  name: string;
  short_name: string;
  logo?: string;
  country?: string;
  league?: string;
}

interface H2HData {
  success: boolean;
  has_history: boolean;
  fixtures: any[];
  summary?: {
    total: number;
    home_wins: number;
    away_wins: number;
    draws: number;
    goals: { home: number; away: number };
  };
}

export default function AnalyzePage() {
  const [selectedHome, setSelectedHome] = useState<Team | null>(null);
  const [selectedAway, setSelectedAway] = useState<Team | null>(null);
  const [h2hData, setH2hData] = useState<H2HData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchHome, setSearchHome] = useState('');
  const [searchAway, setSearchAway] = useState('');
  const [homeResults, setHomeResults] = useState<Team[]>([]);
  const [awayResults, setAwayResults] = useState<Team[]>([]);
  const [searchingHome, setSearchingHome] = useState(false);
  const [searchingAway, setSearchingAway] = useState(false);
  const { isTabLoading, startTabLoading, endTabLoading } = useLoading();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [filteredHomeResults, setFilteredHomeResults] = useState<Team[]>([]);
  const [filteredAwayResults, setFilteredAwayResults] = useState<Team[]>([]);

  const [homeForm, setHomeForm] = useState<{form: string[], summary: any, fixtures: any[]} | null>(null);
  const [awayForm, setAwayForm] = useState<{form: string[], summary: any, fixtures: any[]} | null>(null);
  const [homeStats, setHomeStats] = useState<TeamStats | null>(null);
  const [awayStats, setAwayStats] = useState<TeamStats | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const searchTeams = useCallback(async (query: string, setResults: (teams: Team[]) => void, setFilteredResults: (teams: Team[]) => void, setSearching: (v: boolean) => void) => {
    if (query.length < 2) {
      setResults([]);
      setFilteredResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/teams/search?search=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      if (data.teams && data.teams.length > 0) {
        const queryLower = query.toLowerCase();
        const filtered = data.teams.filter((t: Team) => 
          t.name.toLowerCase().includes(queryLower) || 
          t.country?.toLowerCase().includes(queryLower)
        );
        setResults(data.teams);
        setFilteredResults(filtered.slice(0, 10));
      } else {
        setResults([]);
        setFilteredResults([]);
      }
    } catch (e) {
      console.error('Team search error:', e);
      setResults([]);
      setFilteredResults([]);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchHome.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTeams(searchHome, setHomeResults, setFilteredHomeResults, setSearchingHome);
      }, 300);
    } else {
      setHomeResults([]);
      setFilteredHomeResults([]);
    }
  }, [searchHome, searchTeams]);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchAway.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTeams(searchAway, setAwayResults, setFilteredAwayResults, setSearchingAway);
      }, 300);
    } else {
      setAwayResults([]);
      setFilteredAwayResults([]);
    }
  }, [searchAway, searchTeams]);

  const fetchAnalysis = useCallback(async () => {
    if (!selectedHome || !selectedAway) return;

    startTabLoading('Analyzer');
    setLoading(true);

    const currentYear = new Date().getFullYear();
    const season = '2024';

    try {
      const [h2hRes, homeFormRes, awayFormRes, homeStatsRes, awayStatsRes] = await Promise.allSettled([
        fetch(`/api/h2h?team1=${selectedHome.id}&team2=${selectedAway.id}`),
        fetch(`/api/team-form?teamId=${selectedHome.id}`),
        fetch(`/api/team-form?teamId=${selectedAway.id}`),
        fetch(`/api/team-stats?teamId=${selectedHome.id}&season=${season}`),
        fetch(`/api/team-stats?teamId=${selectedAway.id}&season=${season}`)
      ]);

      let h2h: any = null;
      let hForm: any = null;
      let aForm: any = null;
      let hStats: TeamStats | null = null;
      let aStats: TeamStats | null = null;

      if (h2hRes.status === 'fulfilled' && h2hRes.value.ok) {
        h2h = await h2hRes.value.json();
      }

      if (homeFormRes.status === 'fulfilled' && homeFormRes.value.ok) {
        const data = await homeFormRes.value.json();
        if (data.success) hForm = { form: data.form || [], summary: data.summary, fixtures: data.fixtures || [] };
      }

      if (awayFormRes.status === 'fulfilled' && awayFormRes.value.ok) {
        const data = await awayFormRes.value.json();
        if (data.success) aForm = { form: data.form || [], summary: data.summary, fixtures: data.fixtures || [] };
      }

      if (homeStatsRes.status === 'fulfilled' && homeStatsRes.value.ok) {
        const data = await homeStatsRes.value.json();
        if (data.success) {
          hStats = {
            teamId: data.teamId, teamName: data.teamName, leagueId: data.leagueId, leagueName: data.leagueName,
            gamesPlayed: data.gamesPlayed, wins: data.wins, draws: data.draws, losses: data.losses,
            goalsFor: data.goalsFor, goalsAgainst: data.goalsAgainst, goalDifference: data.goalDifference,
            cleanSheets: data.cleanSheets, homeRecord: data.homeRecord, awayRecord: data.awayRecord,
            form: data.form, position: data.position
          };
        }
      }

      if (awayStatsRes.status === 'fulfilled' && awayStatsRes.value.ok) {
        const data = await awayStatsRes.value.json();
        if (data.success) {
          aStats = {
            teamId: data.teamId, teamName: data.teamName, leagueId: data.leagueId, leagueName: data.leagueName,
            gamesPlayed: data.gamesPlayed, wins: data.wins, draws: data.draws, losses: data.losses,
            goalsFor: data.goalsFor, goalsAgainst: data.goalsAgainst, goalDifference: data.goalDifference,
            cleanSheets: data.cleanSheets, homeRecord: data.homeRecord, awayRecord: data.awayRecord,
            form: data.form, position: data.position
          };
        }
      }

      setH2hData(h2h || { success: false, has_history: false, fixtures: [], summary: { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } } });
      setHomeForm(hForm);
      setAwayForm(aForm);
      setHomeStats(hStats);
      setAwayStats(aStats);

      const formToFixtures = (fixtures: any[]): FormFixture[] => {
        return fixtures.map((f: any) => ({
          id: f.id, date: f.date, league: f.league || '', opponent: f.opponent || '',
          isHome: f.isHome, home_score: f.home_score || 0, away_score: f.away_score || 0,
          goalsFor: f.goalsFor || 0, goalsAgainst: f.goalsAgainst || 0, result: f.result || 'D'
        }));
      };

      const h2hFixtures: H2HFxture[] = (h2h?.fixtures || []).map((f: any) => ({
        id: f.id, date: f.date, competition: f.competition || f.league || '',
        home_team: { name: f.home_team?.name || '' }, away_team: { name: f.away_team?.name || '' },
        home_score: f.home_score || 0, away_score: f.away_score || 0
      }));

      const pred = generatePrediction({
        homeTeam: { id: selectedHome.id, name: selectedHome.name },
        awayTeam: { id: selectedAway.id, name: selectedAway.name },
        league: { id: 0, name: 'Analysis' },
        homeStats: hStats,
        awayStats: aStats,
        homeForm: hForm ? formToFixtures(hForm.fixtures) : null,
        awayForm: aForm ? formToFixtures(aForm.fixtures) : null,
        h2hFixtures,
        h2hSummary: h2h?.summary || { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } }
      });

      setPrediction(pred);
    } catch (e) {
      console.error('Analysis fetch error:', e);
    }
    setLoading(false);
    endTabLoading();
  }, [selectedHome, selectedAway, startTabLoading, endTabLoading]);

  useEffect(() => {
    if (selectedHome && selectedAway) {
      fetchAnalysis();
    }
  }, [selectedHome, selectedAway, fetchAnalysis]);

  const selectTeam = (team: Team, isHome: boolean) => {
    if (isHome) {
      setSelectedHome(team);
      setSearchHome('');
      setHomeResults([]);
      if (selectedAway?.id === team.id) setSelectedAway(null);
    } else {
      setSelectedAway(team);
      setSearchAway('');
      setAwayResults([]);
      if (selectedHome?.id === team.id) setSelectedHome(null);
    }
  };

  const clearSelection = (isHome: boolean) => {
    if (isHome) {
      setSelectedHome(null);
      setSearchHome('');
      setHomeResults([]);
      setHomeForm(null);
      setHomeStats(null);
      setPrediction(null);
    } else {
      setSelectedAway(null);
      setSearchAway('');
      setAwayResults([]);
      setAwayForm(null);
      setAwayStats(null);
      setPrediction(null);
    }
  };

  return (
    <TimeoutHandler>
      <NetworkStatusBanner>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Match Analyzer</h1>
              <p className="text-sm text-[var(--text-muted)]">Search teams and analyze with real data</p>
            </div>
            <NetworkStatusIndicator />
          </div>

          <Card>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Home Team</label>
                  {selectedHome ? (
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                      {selectedHome.logo && <img src={selectedHome.logo} alt={selectedHome.name} className="w-8 h-8" />}
                      <div className="flex-1">
                        <div className="font-medium">{selectedHome.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{selectedHome.country}</div>
                      </div>
                      <button onClick={() => clearSelection(true)} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Search teams globally..."
                          value={searchHome}
                          onChange={(e) => setSearchHome(e.target.value)}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-10 py-3"
                        />
                      </div>
                      {searchingHome && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /></div>}
                      {filteredHomeResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredHomeResults.map(team => (
                            <button key={team.id} onClick={() => selectTeam(team, true)} className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left">
                              {team.logo && <img src={team.logo} alt="" className="w-6 h-6" />}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{team.name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{team.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Away Team</label>
                  {selectedAway ? (
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                      {selectedAway.logo && <img src={selectedAway.logo} alt={selectedAway.name} className="w-8 h-8" />}
                      <div className="flex-1">
                        <div className="font-medium">{selectedAway.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{selectedAway.country}</div>
                      </div>
                      <button onClick={() => clearSelection(false)} className="p-1 hover:bg-[var(--bg-secondary)] rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <input
                          type="text"
                          placeholder="Search teams globally..."
                          value={searchAway}
                          onChange={(e) => setSearchAway(e.target.value)}
                          className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-10 py-3"
                        />
                      </div>
                      {searchingAway && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="w-4 h-4 animate-spin text-blue-400" /></div>}
                      {filteredAwayResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredAwayResults.map(team => (
                            <button key={team.id} onClick={() => selectTeam(team, false)} className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left">
                              {team.logo && <img src={team.logo} alt="" className="w-6 h-6" />}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{team.name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{team.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading || isTabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : selectedHome && selectedAway && (
            <>
              {prediction && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Prediction
                      <Badge variant={prediction.dataQuality === 'high' ? 'success' : prediction.dataQuality === 'medium' ? 'warning' : 'danger'} className="ml-2">
                        {prediction.dataQuality.toUpperCase()} DATA
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className={`p-4 rounded-lg text-center border ${prediction.predictedWinner === 'home' ? 'bg-green-500/20 border-green-500/40' : 'bg-green-500/10 border-green-500/20'}`}>
                        <div className="text-3xl font-bold">{prediction.homeWin}%</div>
                        <div className="text-sm text-[var(--text-muted)]">{selectedHome.short_name} Win</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center border ${prediction.predictedWinner === 'draw' ? 'bg-gray-500/20 border-gray-500/40' : 'bg-gray-500/10 border-gray-500/20'}`}>
                        <div className="text-3xl font-bold">{prediction.draw}%</div>
                        <div className="text-sm text-[var(--text-muted)]">Draw</div>
                      </div>
                      <div className={`p-4 rounded-lg text-center border ${prediction.predictedWinner === 'away' ? 'bg-red-500/20 border-red-500/40' : 'bg-red-500/10 border-red-500/20'}`}>
                        <div className="text-3xl font-bold">{prediction.awayWin}%</div>
                        <div className="text-sm text-[var(--text-muted)]">{selectedAway.short_name} Win</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="p-2 rounded bg-[var(--bg-tertiary)] text-center">
                        <div className="text-[var(--text-muted)] text-xs">Score</div>
                        <div className="font-bold text-lg">{prediction.correctScore}</div>
                      </div>
                      <div className="p-2 rounded bg-[var(--bg-tertiary)] text-center">
                        <div className="text-[var(--text-muted)] text-xs">Expected Goals</div>
                        <div className="font-bold text-lg">{prediction.expectedHomeGoals}-{prediction.expectedAwayGoals}</div>
                      </div>
                      <div className="p-2 rounded bg-[var(--bg-tertiary)] text-center">
                        <div className="text-[var(--text-muted)] text-xs">Confidence</div>
                        <div className="font-bold text-lg">{prediction.confidence}%</div>
                      </div>
                    </div>
                    <div className="mt-3 text-center text-sm">
                      <span className={prediction.overUnder === 'over' ? 'text-blue-400' : 'text-yellow-400'}>
                        {prediction.overUnder === 'over' ? 'Over' : 'Under'} 2.5 ({prediction.overUnderProb}%)
                      </span>
                      {' • '}
                      <span className={prediction.btts === 'yes' ? 'text-purple-400' : 'text-gray-400'}>
                        BTTS {prediction.btts === 'yes' ? 'Yes' : 'No'} ({prediction.bttsProb}%)
                      </span>
                    </div>
                    {prediction.dataQuality !== 'high' && prediction.missingData.length > 0 && (
                      <div className="mt-3 p-2 rounded bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                        Limited data: {prediction.missingData.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {h2hData && h2hData.has_history && h2hData.fixtures && h2hData.fixtures.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Head-to-Head History</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                        <p className="text-2xl font-bold text-blue-400">{h2hData.summary?.home_wins || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedHome.short_name} Wins</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-500/10 text-center">
                        <p className="text-2xl font-bold text-gray-400">{h2hData.summary?.draws || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">Draws</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 text-center">
                        <p className="text-2xl font-bold text-red-400">{h2hData.summary?.away_wins || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedAway.short_name} Wins</p>
                      </div>
                    </div>
                    <div className="text-center text-sm text-[var(--text-muted)] mb-4">
                      Goals: {h2hData.summary?.goals?.home || 0} - {h2hData.summary?.goals?.away || 0}
                    </div>
                    <div className="space-y-2">
                      {h2hData.fixtures.slice(0, 10).map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                          <span className="text-xs text-[var(--text-muted)] w-28 truncate">{h.competition}</span>
                          <div className="flex-1 flex justify-center gap-4">
                            <span className="text-sm w-24 text-right truncate">{h.home_team?.name}</span>
                            <span className="font-mono font-bold px-2">{h.home_score} - {h.away_score}</span>
                            <span className="text-sm w-24 truncate">{h.away_team?.name}</span>
                          </div>
                          <span className="text-xs text-[var(--text-muted)] w-20 text-right">
                            {new Date(h.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(homeStats || awayStats) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Team Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[var(--border-color)]">
                            <th className="text-left py-2 pr-4 text-[var(--text-muted)]">Statistic</th>
                            <th className="text-center py-2 px-2">{selectedHome.short_name}</th>
                            <th className="text-center py-2 px-2">{selectedAway.short_name}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {homeStats && awayStats && [
                            ['League', homeStats.leagueName, awayStats.leagueName],
                            ['Position', homeStats.position ? `${homeStats.position}th` : '—', awayStats.position ? `${awayStats.position}th` : '—'],
                            ['Played', homeStats.gamesPlayed, awayStats.gamesPlayed],
                            ['Wins', homeStats.wins, awayStats.wins],
                            ['Draws', homeStats.draws, awayStats.draws],
                            ['Losses', homeStats.losses, awayStats.losses],
                            ['Goals Scored', `${homeStats.goalsFor} (${homeStats.gamesPlayed > 0 ? (homeStats.goalsFor / homeStats.gamesPlayed).toFixed(2) : '0'}/game)`, `${awayStats.goalsFor} (${awayStats.gamesPlayed > 0 ? (awayStats.goalsFor / awayStats.gamesPlayed).toFixed(2) : '0'}/game)`],
                            ['Goals Conceded', `${homeStats.goalsAgainst} (${homeStats.gamesPlayed > 0 ? (homeStats.goalsAgainst / homeStats.gamesPlayed).toFixed(2) : '0'}/game)`, `${awayStats.goalsAgainst} (${awayStats.gamesPlayed > 0 ? (awayStats.goalsAgainst / awayStats.gamesPlayed).toFixed(2) : '0'}/game)`],
                            ['Clean Sheets', `${homeStats.cleanSheets} (${homeStats.gamesPlayed > 0 ? Math.round(homeStats.cleanSheets / homeStats.gamesPlayed * 100) : 0}%)`, `${awayStats.cleanSheets} (${awayStats.gamesPlayed > 0 ? Math.round(awayStats.cleanSheets / awayStats.gamesPlayed * 100) : 0}%)`],
                          ].map(([label, homeVal, awayVal], i) => (
                            <tr key={i} className="border-b border-[var(--border-color)]/30">
                              <td className="py-2 pr-4 text-[var(--text-muted)]">{label as string}</td>
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

              {(homeForm || awayForm) && (
                <Card>
                  <CardHeader><CardTitle>Recent Form (Last 5)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      {homeForm && (
                        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                          <div className="flex items-center gap-2 mb-3">
                            {selectedHome.logo && <img src={selectedHome.logo} alt="" className="w-5 h-5" />}
                            <span className="font-bold">{selectedHome.short_name}</span>
                            {homeForm.summary && <span className="text-xs text-[var(--text-muted)] ml-auto">{homeForm.summary.wins}W-{homeForm.summary.draws}D-{homeForm.summary.losses}L</span>}
                          </div>
                          <div className="flex gap-1 mb-3">
                            {homeForm.form.slice(0, 5).map((r: string, i: number) => (
                              <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${r === 'W' ? 'bg-green-500/30 text-green-400' : r === 'D' ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>{r}</span>
                            ))}
                          </div>
                          <div className="space-y-1 text-xs">
                            {homeForm.fixtures?.slice(0, 5).map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">{m.isHome ? 'Home' : 'Away'} vs {m.opponent}</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${m.result === 'W' ? 'bg-green-500/20 text-green-400' : m.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{m.result}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {awayForm && (
                        <div className="p-4 rounded-lg bg-[var(--bg-tertiary)]">
                          <div className="flex items-center gap-2 mb-3">
                            {selectedAway.logo && <img src={selectedAway.logo} alt="" className="w-5 h-5" />}
                            <span className="font-bold">{selectedAway.short_name}</span>
                            {awayForm.summary && <span className="text-xs text-[var(--text-muted)] ml-auto">{awayForm.summary.wins}W-{awayForm.summary.draws}D-{awayForm.summary.losses}L</span>}
                          </div>
                          <div className="flex gap-1 mb-3">
                            {awayForm.form.slice(0, 5).map((r: string, i: number) => (
                              <span key={i} className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${r === 'W' ? 'bg-green-500/30 text-green-400' : r === 'D' ? 'bg-yellow-500/30 text-yellow-400' : 'bg-red-500/30 text-red-400'}`}>{r}</span>
                            ))}
                          </div>
                          <div className="space-y-1 text-xs">
                            {awayForm.fixtures?.slice(0, 5).map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between">
                                <span className="text-[var(--text-muted)]">{m.isHome ? 'Home' : 'Away'} vs {m.opponent}</span>
                                <span className={`px-1.5 py-0.5 rounded font-bold ${m.result === 'W' ? 'bg-green-500/20 text-green-400' : m.result === 'D' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{m.result}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </NetworkStatusBanner>
      <TabLoadingOverlay />
    </TimeoutHandler>
  );
}
