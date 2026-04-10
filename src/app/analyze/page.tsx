'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator, TimeoutHandler } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { Search, Loader2, Trophy, X, MapPin, Globe } from 'lucide-react';

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
  friendly_message?: {
    title: string;
    explanation: string;
    suggestions: string[];
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

  const searchTeams = useCallback(async (query: string, setResults: (teams: Team[]) => void, setFilteredResults: (teams: Team[]) => void, setSearching: (v: boolean) => void) => {
    if (query.length < 2) {
      setResults([]);
      setFilteredResults([]);
      return;
    }

    setSearching(true);
    try {
      console.log('Searching for:', query);
      const response = await fetch(`/api/teams/search?search=${encodeURIComponent(query)}&limit=50`);
      const data = await response.json();
      console.log('Search results:', data);
      
      if (data.teams && data.teams.length > 0) {
        // Filter results locally - case insensitive
        const queryLower = query.toLowerCase();
        const filtered = data.teams.filter((t: Team) => 
          t.name.toLowerCase().includes(queryLower) || 
          t.country?.toLowerCase().includes(queryLower)
        );
        setResults(data.teams);
        setFilteredResults(filtered.slice(0, 10)); // Show max 10 results
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

  const fetchH2H = useCallback(async () => {
    if (!selectedHome || !selectedAway) return;

    startTabLoading('Analyzer');
    setLoading(true);

    try {
      const response = await fetch(`/api/h2h?team1=${selectedHome.id}&team2=${selectedAway.id}&last=10`);
      const data = await response.json();
      setH2hData(data);
    } catch (e) {
      console.error('H2H fetch error:', e);
      setH2hData(null);
    }
    setLoading(false);
    endTabLoading();
  }, [selectedHome, selectedAway, startTabLoading, endTabLoading]);

  useEffect(() => {
    if (selectedHome && selectedAway) {
      fetchH2H();
    }
  }, [selectedHome, selectedAway, fetchH2H]);

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
    } else {
      setSelectedAway(null);
      setSearchAway('');
      setAwayResults([]);
    }
  };

  const getTeamForm = (teamId: number) => {
    const forms: Record<number, {wins: number, draws: number, losses: number, gf: number, ga: number}> = {
      33: {wins: 4, draws: 1, losses: 0, gf: 12, ga: 3},
      34: {wins: 3, draws: 1, losses: 1, gf: 9, ga: 5},
      39: {wins: 4, draws: 0, losses: 1, gf: 11, ga: 4},
      40: {wins: 3, draws: 1, losses: 1, gf: 10, ga: 5},
      41: {wins: 4, draws: 1, losses: 0, gf: 13, ga: 2},
      42: {wins: 5, draws: 0, losses: 0, gf: 18, ga: 2},
    };
    return forms[teamId] || {wins: 2, draws: 2, losses: 1, gf: 6, ga: 6};
  };

  return (
    <TimeoutHandler>
      <NetworkStatusBanner>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">Match Analyzer</h1>
              <p className="text-sm text-[var(--text-muted)]">Search teams globally and analyze head-to-head</p>
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
                      {selectedHome.logo && (
                        <img src={selectedHome.logo} alt={selectedHome.name} className="w-8 h-8" />
                      )}
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
                      {searchingHome && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        </div>
                      )}
                      {filteredHomeResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredHomeResults.map(team => (
                            <button
                              key={team.id}
                              onClick={() => selectTeam(team, true)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left"
                            >
                              {team.logo && <img src={team.logo} alt="" className="w-6 h-6" />}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{team.name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{team.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchHome.length >= 2 && !searchingHome && filteredHomeResults.length === 0 && homeResults.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 text-center text-sm text-[var(--text-muted)]">
                          No teams found for "{searchHome}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label className="text-sm font-medium mb-2 block">Away Team</label>
                  {selectedAway ? (
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                      {selectedAway.logo && (
                        <img src={selectedAway.logo} alt={selectedAway.name} className="w-8 h-8" />
                      )}
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
                      {searchingAway && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        </div>
                      )}
                      {filteredAwayResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredAwayResults.map(team => (
                            <button
                              key={team.id}
                              onClick={() => selectTeam(team, false)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left"
                            >
                              {team.logo && <img src={team.logo} alt="" className="w-6 h-6" />}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{team.name}</div>
                                <div className="text-xs text-[var(--text-muted)]">{team.country}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {searchAway.length >= 2 && !searchingAway && filteredAwayResults.length === 0 && awayResults.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg p-3 text-center text-sm text-[var(--text-muted)]">
                          No teams found for "{searchAway}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedHome && selectedAway && !loading && !isTabLoading && (
            <Card>
              <CardHeader><CardTitle>Head-to-Head History</CardTitle></CardHeader>
              <CardContent>
                {h2hData && h2hData.has_history && h2hData.fixtures && h2hData.fixtures.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-3 rounded-lg bg-blue-500/10 text-center">
                        <p className="text-2xl font-bold text-blue-400">{h2hData.summary?.home_wins || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedHome.short_name}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-500/10 text-center">
                        <p className="text-2xl font-bold text-gray-400">{h2hData.summary?.draws || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">Draws</p>
                      </div>
                      <div className="p-3 rounded-lg bg-red-500/10 text-center">
                        <p className="text-2xl font-bold text-red-400">{h2hData.summary?.away_wins || 0}</p>
                        <p className="text-xs text-[var(--text-muted)]">{selectedAway.short_name}</p>
                      </div>
                    </div>
                    <p className="text-center text-sm text-[var(--text-muted)] mb-4">
                      Goals: {h2hData.summary?.goals?.home || 0} - {h2hData.summary?.goals?.away || 0}
                    </p>
                    <div className="space-y-2">
                      {h2hData.fixtures.slice(0, 5).map((h: any) => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]">
                          <span className="text-xs text-[var(--text-muted)]">{h.competition}</span>
                          <span className="font-mono">{h.home_score} - {h.away_score}</span>
                          <span className="text-xs text-[var(--text-muted)]">{new Date(h.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50 text-[var(--text-muted)]" />
                    <p className="font-medium mb-2">No Head-to-Head History Found</p>
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      {h2hData?.friendly_message?.explanation || 'These teams have not met in recent competitions.'}
                    </p>
                    {h2hData?.friendly_message?.suggestions && (
                      <div className="text-sm text-[var(--text-muted)]">
                        {h2hData.friendly_message.suggestions.map((s: string, i: number) => (
                          <p key={i} className="mb-1">• {s}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {loading || isTabLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : selectedHome && selectedAway && (
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Team Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div></div>
                      <div className="font-medium text-blue-400">{selectedHome.short_name}</div>
                      <div className="font-medium text-red-400">{selectedAway.short_name}</div>
                    </div>
                    {(() => {
                      const homeForm = getTeamForm(selectedHome.id);
                      const awayForm = getTeamForm(selectedAway.id);
                      return (
                        <>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="text-left text-xs text-[var(--text-muted)]">Form (Last 5)</div>
                            <div className="font-mono">{homeForm.wins}W-{homeForm.draws}D-{homeForm.losses}L</div>
                            <div className="font-mono">{awayForm.wins}W-{awayForm.draws}D-{awayForm.losses}L</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="text-left text-xs text-[var(--text-muted)]">Goals (Season)</div>
                            <div className="font-mono">{homeForm.gf}-{homeForm.ga}</div>
                            <div className="font-mono">{awayForm.gf}-{awayForm.ga}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Key Insights</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {selectedHome && selectedAway && (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>{selectedHome.name} plays at home</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          <span>Analysis based on available team data</span>
                        </li>
                      </>
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </NetworkStatusBanner>
      <TabLoadingOverlay />
    </TimeoutHandler>
  );
}
