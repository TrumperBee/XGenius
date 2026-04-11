'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, Badge } from '@/components/ui';
import { TabLoadingOverlay } from '@/components/InitialLoadingScreen';
import { NetworkStatusBanner, NetworkStatusIndicator } from '@/components/NetworkStatus';
import { useLoading } from '@/components/LoadingContext';
import { Search, Loader2, X, Calendar, Clock, Star, Trophy, Zap, ChevronDown, Filter } from 'lucide-react';
import Link from 'next/link';

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

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', short: 'PL' },
  { id: 140, name: 'La Liga', short: 'LL' },
  { id: 78, name: 'Bundesliga', short: 'BL' },
  { id: 135, name: 'Serie A', short: 'SA' },
  { id: 61, name: 'Ligue 1', short: 'L1' },
  { id: 2, name: 'Champions League', short: 'UCL' },
  { id: 3, name: 'Europa League', short: 'UEL' },
  { id: 848, name: 'Conference League', short: 'UECL' },
];

const SECOND_TIER = [
  { id: 88, name: 'Eredivisie', short: 'ED' },
  { id: 94, name: 'Primeira Liga', short: 'PL' },
  { id: 179, name: 'Scottish Premiership', short: 'SP' },
  { id: 203, name: 'Turkish Super Lig', short: 'TSL' },
  { id: 117, name: 'AFCON', short: 'AFCON' },
  { id: 29, name: 'Euros', short: 'EUR' },
];

function getLeaguePriority(leagueId: number): number {
  const topIndex = TOP_LEAGUES.findIndex(l => l.id === leagueId);
  if (topIndex !== -1) return topIndex;
  const secondIndex = SECOND_TIER.findIndex(l => l.id === leagueId);
  if (secondIndex !== -1) return 10 + secondIndex;
  return 100;
}

function getLeagueColor(leagueName: string): string {
  const lower = leagueName.toLowerCase();
  if (lower.includes('champions')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (lower.includes('europa')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (lower.includes('premier')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (lower.includes('la liga')) return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
  if (lower.includes('bundesliga')) return 'bg-red-600/20 text-red-300 border-red-600/30';
  if (lower.includes('serie')) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (lower.includes('ligue')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Team[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedLeagues, setSelectedLeagues] = useState<number[]>(TOP_LEAGUES.map(l => l.id));
  const [showAllLeagues, setShowAllLeagues] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const { isTabLoading } = useLoading();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFixtures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`/api/fixtures?date=${today}&days=1`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.matches && data.matches.length > 0) {
        setFixtures(data.matches);
      } else {
        setFixtures([]);
      }
    } catch (e) {
      console.error('Fetch error:', e);
      setError('Failed to load fixtures. Please try again.');
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
      if (data.teams) {
        setSearchResults(data.teams);
      } else {
        setSearchResults([]);
      }
    } catch (e) {
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

  const toggleLeague = (leagueId: number) => {
    setSelectedLeagues(prev => {
      if (prev.includes(leagueId)) {
        return prev.filter(id => id !== leagueId);
      }
      return [...prev, leagueId];
    });
  };

  const filteredAndSortedFixtures = useMemo(() => {
    let result = [...fixtures];
    
    if (selectedTeam) {
      result = result.filter(f => 
        f.home_team.id === selectedTeam.id || 
        f.away_team.id === selectedTeam.id
      );
    }
    
    if (selectedLeagues.length < TOP_LEAGUES.length + SECOND_TIER.length) {
      result = result.filter(f => selectedLeagues.includes(f.league_id));
    }
    
    if (searchQuery.length >= 2) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.home_team.name.toLowerCase().includes(query) ||
        f.away_team.name.toLowerCase().includes(query)
      );
    }
    
    result.sort((a, b) => {
      const priorityA = getLeaguePriority(a.league_id);
      const priorityB = getLeaguePriority(b.league_id);
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (timeA !== timeB) return timeA - timeB;
      
      return a.home_team.name.localeCompare(b.home_team.name);
    });
    
    return result;
  }, [fixtures, selectedTeam, selectedLeagues, searchQuery]);

  const groupByLeague = useMemo(() => {
    const groups: Record<string, Fixture[]> = {};
    filteredAndSortedFixtures.forEach(fixture => {
      if (!groups[fixture.league]) groups[fixture.league] = [];
      groups[fixture.league].push(fixture);
    });
    return groups;
  }, [filteredAndSortedFixtures]);

  const visibleLeagues = showAllLeagues 
    ? [...TOP_LEAGUES, ...SECOND_TIER]
    : TOP_LEAGUES;

  return (
    <NetworkStatusBanner>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">Fixtures</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {filteredAndSortedFixtures.length} matches
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <NetworkStatusIndicator />
            
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center border border-[var(--border-color)]"
                aria-label="Search teams"
              >
                <Search className="w-5 h-5" />
              </button>
              
              {showSearch && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-3 text-base"
                      autoFocus
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-400" />
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                      {searchResults.slice(0, 8).map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleSelectTeam(team)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-[var(--bg-tertiary)] text-left rounded-lg transition-colors"
                        >
                          {team.logo && <img src={team.logo} alt="" className="w-8 h-8 object-contain" />}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{team.name}</div>
                            <div className="text-xs text-[var(--text-muted)]">{team.country || 'Unknown'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                    <p className="mt-3 text-sm text-center text-[var(--text-muted)] py-4">
                      No teams found
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`p-2.5 rounded-lg transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center border ${
                filterOpen || selectedLeagues.length < TOP_LEAGUES.length
                  ? 'bg-[var(--accent-blue)]/20 border-[var(--accent-blue)]/50 text-[var(--accent-blue)]'
                  : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              aria-label="Filter competitions"
            >
              <Filter className="w-5 h-5" />
            </button>
            
            <button
              onClick={fetchFixtures}
              disabled={loading}
              className="p-2.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-50 min-w-[48px] min-h-[48px] flex items-center justify-center border border-[var(--border-color)]"
              aria-label="Refresh fixtures"
            >
              <Clock className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {filterOpen && (
          <Card className="border-[var(--accent-blue)]/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Filter Competitions</h3>
                <button
                  onClick={() => setSelectedLeagues(TOP_LEAGUES.map(l => l.id))}
                  className="text-xs text-[var(--accent-blue)] hover:underline"
                >
                  Reset
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {visibleLeagues.map(league => (
                  <button
                    key={league.id}
                    onClick={() => toggleLeague(league.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                      selectedLeagues.includes(league.id)
                        ? 'bg-[var(--accent-green)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {league.name}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowAllLeagues(!showAllLeagues)}
                className="mt-3 text-sm text-[var(--accent-blue)] hover:underline flex items-center gap-1"
              >
                {showAllLeagues ? 'Show less' : 'Show more competitions'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showAllLeagues ? 'rotate-180' : ''}`} />
              </button>
            </CardContent>
          </Card>
        )}

        {selectedTeam && (
          <Card className="border-[var(--accent-blue)]/30 bg-[var(--accent-blue)]/5">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedTeam.logo && <img src={selectedTeam.logo} alt="" className="w-8 h-8" />}
                <span className="text-sm">Showing: <strong>{selectedTeam.name}</strong></span>
                <Badge variant="info">{filteredAndSortedFixtures.length} match{filteredAndSortedFixtures.length !== 1 ? 'es' : ''}</Badge>
              </div>
              <button onClick={clearSearch} className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
            <span className="ml-3 text-[var(--text-muted)]">Loading fixtures...</span>
          </div>
        ) : error ? (
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="py-8 text-center">
              <Trophy className="w-12 h-12 mx-auto text-red-500 mb-3" />
              <p className="text-lg font-medium mb-2">Failed to load fixtures</p>
              <p className="text-sm text-[var(--text-muted)] mb-4">{error}</p>
              <button onClick={fetchFixtures} className="px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm min-h-[44px]">
                Try Again
              </button>
            </CardContent>
          </Card>
        ) : filteredAndSortedFixtures.length === 0 ? (
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="py-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
              <p className="text-lg font-medium mb-2">No Fixtures Available</p>
              <p className="text-sm text-[var(--text-muted)]">
                {selectedTeam 
                  ? `${selectedTeam.name} has no upcoming fixtures.`
                  : 'No matches found for the selected competitions.'}
              </p>
              <button 
                onClick={() => {
                  setSelectedLeagues(TOP_LEAGUES.map(l => l.id));
                  setSelectedTeam(null);
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm min-h-[44px]"
              >
                Clear Filters
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupByLeague).map(([league, leagueFixtures]) => (
              <div key={league}>
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className={`w-5 h-5 ${league.toLowerCase().includes('champions') ? 'text-yellow-400' : 'text-[var(--text-muted)]'}`} />
                  <h2 className="text-base font-bold">{league}</h2>
                  <Badge variant="info" className="text-xs">{leagueFixtures.length}</Badge>
                  {league.toLowerCase().includes('champions') && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                </div>
                
                <div className="space-y-2">
                  {leagueFixtures.map(fixture => {
                    const kickoffTime = new Date(fixture.date);
                    const isLive = fixture.status === 'live';
                    const isFinished = fixture.status === 'finished';
                    
                    return (
                      <Link key={fixture.id} href={`/match/${fixture.id}`}>
                        <Card className="hover:border-[var(--accent-blue)]/50 transition-all cursor-pointer">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="text-sm font-medium min-w-[50px]">
                                  {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block mr-1" />}
                                  {kickoffTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="text-right min-w-0 flex-1">
                                    <span className="font-semibold text-sm truncate block">{fixture.home_team.name}</span>
                                  </div>
                                  
                                  <div className="text-center px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg min-w-[70px]">
                                    {isFinished || isLive ? (
                                      <span className="font-mono font-bold">
                                        {fixture.home_score ?? 0} - {fixture.away_score ?? 0}
                                      </span>
                                    ) : (
                                      <span className="text-[var(--text-muted)] text-sm">vs</span>
                                    )}
                                  </div>
                                  
                                  <div className="text-left min-w-0 flex-1">
                                    <span className="font-semibold text-sm truncate block">{fixture.away_team.name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-2">
                                {isLive && <Badge variant="danger" className="text-xs">LIVE</Badge>}
                                {isFinished && <Badge variant="success" className="text-xs">FT</Badge>}
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
