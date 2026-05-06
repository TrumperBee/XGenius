'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, Badge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { Search, Loader2, X, Calendar, Clock, Shield, Trophy, Star } from 'lucide-react';
import Link from 'next/link';
import { ALLOWED_LEAGUES, getLeagueColor, getLeagueById } from '@/config/leagues';

interface Match {
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

interface Team {
  id: number;
  name: string;
  short_name: string;
  logo?: string;
  country?: string;
}

function getLeaguePriority(leagueId: number): number {
  const index = ALLOWED_LEAGUES.findIndex(l => l.id === leagueId);
  if (index !== -1) return ALLOWED_LEAGUES[index].tier * 100 + index;
  return 999;
}

export default function TodayPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const { isTabLoading } = useLoading();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMatches = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fixtures?date=${date}&days=1`, {
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json();
      console.log('Today API Response:', data);
      
      if (data.matches && data.matches.length > 0) {
        setAllMatches(data.matches);
        setMatches(data.matches);
        console.log('Loaded', data.matches.length, 'matches');
      } else {
        setAllMatches([]);
        setMatches([]);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Failed to load matches');
      setAllMatches([]);
      setMatches([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches(selectedDate);
  }, [selectedDate, fetchMatches]);

  const searchTeams = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/teams/search?search=${encodeURIComponent(query)}&limit=30`);
      const data = await response.json();
      console.log('Team search response:', data);
      if (data.teams) {
        setSearchResults(data.teams);
      }
    } catch (e) {
      console.error('Search error:', e);
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchTeams(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchTeams]);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const clearSearch = () => {
    setSelectedTeam(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const filteredMatches = useMemo(() => {
    let result = [...matches];
    
    if (selectedTeam) {
      result = result.filter(m => 
        m.home_team.id === selectedTeam.id || 
        m.away_team.id === selectedTeam.id
      );
    }
    
    result.sort((a, b) => {
      const priorityA = getLeaguePriority(a.league_id);
      const priorityB = getLeaguePriority(b.league_id);
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    return result;
  }, [matches, selectedTeam]);

  const groupedByLeague = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    filteredMatches.forEach(match => {
      if (!groups[match.league]) groups[match.league] = [];
      groups[match.league].push(match);
    });
    return groups;
  }, [filteredMatches]);

  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  }, []);

  return (
    <NetworkStatusBanner>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Daily Predictions</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {filteredMatches.length} matches today
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NetworkStatusIndicator />
            
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center border border-[var(--border-color)]"
                aria-label="Search teams"
              >
                <Search className="w-5 h-5" />
              </button>
              
              {showSearch && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-xl z-50 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search for a team..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-3"
                      autoFocus
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-64 overflow-y-auto">
                      {searchResults.map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleSelectTeam(team)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left rounded-lg"
                        >
                          {team.logo && <img src={team.logo} alt="" className="w-8 h-8" />}
                          <div className="flex-1">
                            <div className="font-medium">{team.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{team.country || 'Unknown'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="mt-3 text-sm text-center text-[var(--text-muted)] py-4">
                      No teams found for "{searchQuery}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
              <div className="flex bg-[var(--bg-tertiary)] rounded-lg p-1">
                {dates.map(date => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors min-h-[48px] ${
                      selectedDate === date
                        ? 'bg-[var(--accent-blue)] text-white'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedTeam && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTeam.logo && <img src={selectedTeam.logo} alt="" className="w-8 h-8" />}
                <span className="text-sm">Showing: <strong>{selectedTeam.name}</strong></span>
                <Badge variant="info">{filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}</Badge>
              </div>
              <button onClick={clearSearch} className="p-1 hover:bg-[var(--bg-tertiary)] rounded">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <span className="text-sm">Guardian AI Active</span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Only verified data
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-[var(--text-muted)]">Loading matches...</span>
          </div>
        ) : error ? (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center">
              <p className="text-lg font-medium mb-2">Failed to load matches</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>
              <button onClick={() => fetchMatches(selectedDate)} className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm">
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : filteredMatches.length === 0 && selectedTeam ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 text-center">
              <Search className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <p className="text-lg font-medium mb-2">{selectedTeam.name} has no matches today</p>
              <p className="text-sm text-[var(--text-muted)]">
                {selectedTeam.name} is not playing on this date.
              </p>
            </CardContent>
          </Card>
        ) : filteredMatches.length === 0 ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <p className="text-lg font-medium mb-2">No Matches Today</p>
              <p className="text-sm text-[var(--text-muted)]">
                There are no major league matches scheduled for this date.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByLeague).map(([league, leagueMatches]) => (
              <div key={league}>
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className={`w-5 h-5 ${getLeagueColor(league)}`} />
                  <h2 className="text-lg font-bold">{league}</h2>
                  <Badge variant="info">{leagueMatches.length}</Badge>
                  {league.toLowerCase().includes('champions') && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                </div>
                
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {leagueMatches.map(match => {
                    const kickoffTime = new Date(match.date);
                    const isLive = match.status === 'live';
                    const isFinished = match.status === 'finished';
                    
                    return (
                      <Link key={match.id} href={`/match/${match.id}`}>
                        <Card className="hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer hover:shadow-lg h-full">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={getLeagueColor(match.league)}>
                                {match.league}
                              </Badge>
                              <div className="flex items-center gap-2">
                                {isLive && <Badge variant="danger">LIVE</Badge>}
                                {isFinished && <Badge variant="success">FT</Badge>}
                                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                  <Clock className="w-3 h-3" />
                                  {kickoffTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {match.home_team.logo && (
                                  <img src={match.home_team.logo} alt={match.home_team.name} className="w-8 h-8 flex-shrink-0" />
                                )}
                                <span className="font-medium text-sm truncate">{match.home_team.short}</span>
                              </div>
                              
                              <div className="px-3 py-1 bg-[var(--bg-tertiary)] rounded text-center mx-2">
                                {isFinished || isLive ? (
                                  <span className="font-mono font-bold">
                                    {match.home_score ?? 0} - {match.away_score ?? 0}
                                  </span>
                                ) : (
                                  <span className="text-[var(--text-muted)] text-sm">vs</span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                <span className="font-medium text-sm truncate">{match.away_team.short}</span>
                                {match.away_team.logo && (
                                  <img src={match.away_team.logo} alt={match.away_team.name} className="w-8 h-8 flex-shrink-0" />
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="font-medium">Value Bets</span>
              <Badge variant="warning">AI Detected</Badge>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              Value bets calculated from real-time odds vs model probabilities.
            </p>
          </CardContent>
        </Card>
      </div>
      <TabLoadingOverlay />
    </NetworkStatusBanner>
  );
}
