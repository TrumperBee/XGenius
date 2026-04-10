'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, Badge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { Search, Loader2, X, Calendar, Clock, Star, Trophy, Zap } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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

interface Team {
  id: number;
  name: string;
  short_name: string;
  logo?: string;
  country?: string;
}

const LEAGUE_PRIORITY: Record<string, number> = {
  'uefa champions league': 1,
  'champions league': 1,
  'uefa europa league': 2,
  'europa league': 2,
  'premier league': 3,
  'la liga': 4,
  'bundesliga': 5,
  'serie a': 6,
  'ligue 1': 7,
  'eredivisie': 8,
  'primeira liga': 9,
  'championship': 10,
  'serie b': 11,
  'liga nos': 9,
  'scot-premiership': 12,
  'jupiler pro league': 13,
  'super lig': 14,
  'a-league': 15,
};

const LEAGUE_COLORS: Record<string, string> = {
  'champions league': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'uefa champions league': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'europa league': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'uefa euroa league': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'premier league': 'bg-red-500/20 text-red-400 border-red-500/30',
  'la liga': 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30',
  'bundesliga': 'bg-red-600/20 text-red-300 border-red-600/30',
  'serie a': 'bg-green-500/20 text-green-400 border-green-500/30',
  'ligue 1': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

const COMPETITIONS = [
  'All Competitions',
  'Champions League',
  'Europa League',
  'Premier League',
  'La Liga',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
];

function getLeaguePriority(leagueName: string): number {
  const lower = leagueName.toLowerCase();
  for (const [key, priority] of Object.entries(LEAGUE_PRIORITY)) {
    if (lower.includes(key)) return priority;
  }
  return 100; // Other leagues at the bottom
}

function getLeagueColor(leagueName: string): string {
  const lower = leagueName.toLowerCase();
  for (const [key, color] of Object.entries(LEAGUE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [allFixtures, setAllFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState('All Competitions');
  const { isTabLoading } = useLoading();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/fixtures?date=${today}&days=3`, {
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.matches && data.matches.length > 0) {
        setAllFixtures(data.matches);
        setFixtures(data.matches);
        console.log('Loaded', data.matches.length, 'fixtures');
      } else {
        console.log('No matches in API response');
        setAllFixtures([]);
        setFixtures([]);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Failed to load fixtures');
      setAllFixtures([]);
      setFixtures([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFixtures();
  }, [fetchFixtures]);

  const searchTeams = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await fetch(`/api/teams/search?search=${encodeURIComponent(query)}&limit=30`);
      const data = await response.json();
      console.log('Search response:', data);
      if (data.teams) {
        setSearchResults(data.teams);
        console.log('Found', data.teams.length, 'teams');
      } else {
        setSearchResults([]);
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

  const filteredAndSortedFixtures = useMemo(() => {
    let result = [...fixtures];
    
    // Filter by selected team
    if (selectedTeam) {
      result = result.filter(f => 
        f.home_team.id === selectedTeam.id || 
        f.away_team.id === selectedTeam.id
      );
    }
    
    // Filter by competition
    if (selectedCompetition !== 'All Competitions') {
      result = result.filter(f => 
        f.league.toLowerCase().includes(selectedCompetition.toLowerCase())
      );
    }
    
    // Sort by competition priority, then by time, then by team name
    result.sort((a, b) => {
      const priorityA = getLeaguePriority(a.league);
      const priorityB = getLeaguePriority(b.league);
      
      // First by competition prestige
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Then by kickoff time (earliest first)
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      
      // Finally by home team name alphabetically
      return a.home_team.name.localeCompare(b.home_team.name);
    });
    
    return result;
  }, [fixtures, selectedTeam, selectedCompetition]);

  const groupByLeague = useMemo(() => {
    const groups: Record<string, Fixture[]> = {};
    filteredAndSortedFixtures.forEach(fixture => {
      if (!groups[fixture.league]) groups[fixture.league] = [];
      groups[fixture.league].push(fixture);
    });
    return groups;
  }, [filteredAndSortedFixtures]);

  const competitions = useMemo(() => {
    const leagues = new Set(fixtures.map(f => f.league));
    const comps = ['All Competitions'];
    leagues.forEach(l => {
      if (!comps.includes(l)) comps.push(l);
    });
    return comps;
  }, [fixtures]);

  return (
    <NetworkStatusBanner>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Upcoming Fixtures</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {filteredAndSortedFixtures.length} matches
              {fixtures.length > 0 && ` (${fixtures.length} loaded)`}
              {selectedCompetition !== 'All Competitions' && ` in ${selectedCompetition}`}
              {selectedTeam && ` for ${selectedTeam.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
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
                  
                  {searchQuery.length < 2 && (
                    <p className="mt-3 text-xs text-center text-[var(--text-muted)]">
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={fetchFixtures}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 min-w-[48px] min-h-[48px] flex items-center justify-center border border-[var(--border-color)]"
              aria-label="Refresh fixtures"
            >
              <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Competition Filter */}
        <div className="flex gap-2 flex-wrap">
          {competitions.map(comp => (
            <button
              key={comp}
              onClick={() => setSelectedCompetition(comp)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px] ${
                selectedCompetition === comp
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {comp}
            </button>
          ))}
        </div>

        {selectedTeam && (
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTeam.logo && <img src={selectedTeam.logo} alt="" className="w-8 h-8" />}
                <span className="text-sm">Showing: <strong>{selectedTeam.name}</strong></span>
                <Badge variant="info">{filteredAndSortedFixtures.length} match{filteredAndSortedFixtures.length !== 1 ? 'es' : ''}</Badge>
              </div>
              <button onClick={clearSearch} className="p-1 hover:bg-[var(--bg-tertiary)] rounded">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-[var(--text-muted)]">Loading fixtures...</span>
          </div>
        ) : error ? (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center">
              <Trophy className="w-12 h-12 mx-auto text-red-500 mb-3" />
              <p className="text-lg font-medium mb-2">Failed to load fixtures</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>
              <button onClick={fetchFixtures} className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm">
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : filteredAndSortedFixtures.length === 0 && selectedTeam ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 text-center">
              <Search className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <p className="text-lg font-medium mb-2">{selectedTeam.name} has no upcoming fixtures</p>
              <p className="text-sm text-[var(--text-muted)]">
                Try clearing the team filter to see all matches.
              </p>
              <button 
                onClick={clearSearch}
                className="mt-4 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm"
              >
                Clear Filter
              </button>
            </CardContent>
          </Card>
        ) : filteredAndSortedFixtures.length === 0 ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <p className="text-lg font-medium mb-2">No Fixtures Available</p>
              <p className="text-sm text-[var(--text-muted)]">
                No matches found for today. Try checking upcoming days.
              </p>
              <button 
                onClick={() => {
                  setSelectedCompetition('All Competitions');
                  setSelectedTeam(null);
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm"
              >
                Clear All Filters
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupByLeague).map(([league, leagueFixtures]) => (
              <div key={league}>
                <div className="flex items-center gap-3 mb-4">
                  <Trophy className={`w-5 h-5 ${league.toLowerCase().includes('champions') ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`} />
                  <h2 className="text-lg font-bold">{league}</h2>
                  <Badge variant="info">{leagueFixtures.length}</Badge>
                  {league.toLowerCase().includes('champions') && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                </div>
                
                <div className="space-y-3">
                  {leagueFixtures.map(fixture => {
                    const kickoffTime = new Date(fixture.date);
                    const isLive = fixture.status === 'live';
                    const isFinished = fixture.status === 'finished';
                    
                    return (
                      <Link key={fixture.id} href={`/match/${fixture.id}`}>
                        <Card className="hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer hover:shadow-lg">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="text-center min-w-[60px]">
                                  <div className="flex items-center gap-1 text-sm font-medium">
                                    {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                    <Clock className="w-4 h-4" />
                                    {kickoffTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="text-right min-w-[120px]">
                                    {fixture.home_team.logo && (
                                      <img src={fixture.home_team.logo} alt="" className="w-6 h-6 inline-block mr-2" />
                                    )}
                                    <span className="font-semibold">{fixture.home_team.name}</span>
                                  </div>
                                  
                                  <div className="text-center px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg min-w-[80px]">
                                    {isFinished || isLive ? (
                                      <span className="font-mono font-bold text-lg">
                                        {fixture.home_score ?? 0} - {fixture.away_score ?? 0}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-muted)]">vs</span>
                                    )}
                                  </div>
                                  
                                  <div className="text-left min-w-[120px]">
                                    {fixture.away_team.logo && (
                                      <img src={fixture.away_team.logo} alt="" className="w-6 h-6 inline-block mr-2" />
                                    )}
                                    <span className="font-semibold">{fixture.away_team.name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {isLive && <Badge variant="danger">LIVE</Badge>}
                                {isFinished && <Badge variant="success">FT</Badge>}
                                <Badge className={getLeagueColor(fixture.league)}>
                                  {fixture.league}
                                </Badge>
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
      </div>
      <TabLoadingOverlay />
    </NetworkStatusBanner>
  );
}
