export interface LeagueConfig {
  id: number;
  name: string;
  short: string;
  country: string;
  tier: 1 | 2 | 3 | 4 | 5;
  tierLabel: string;
  type: 'league' | 'cup' | 'international' | 'friendly';
  season?: string;
}

export const ALLOWED_LEAGUES: LeagueConfig[] = [
  { id: 1, name: 'World Cup', short: 'WC', country: 'International', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 15, name: 'World Cup - Women', short: 'WWC', country: 'International', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 2, name: 'UEFA Champions League', short: 'UCL', country: 'Europe', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 3, name: 'UEFA Europa League', short: 'UEL', country: 'Europe', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 848, name: 'UEFA Europa Conference League', short: 'UECL', country: 'Europe', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 15, name: 'FIFA Club World Cup', short: 'CWC', country: 'International', tier: 1, tierLabel: 'Global Tournaments', type: 'international' },
  { id: 667, name: 'Friendly International', short: 'INT', country: 'International', tier: 1, tierLabel: 'Global Tournaments', type: 'friendly' },
  { id: 666, name: 'Club Friendlies', short: 'CLB', country: 'International', tier: 1, tierLabel: 'Global Tournaments', type: 'friendly' },

  { id: 39, name: 'Premier League', short: 'PL', country: 'England', tier: 2, tierLabel: 'Top 5 Leagues', type: 'league' },
  { id: 140, name: 'La Liga', short: 'LL', country: 'Spain', tier: 2, tierLabel: 'Top 5 Leagues', type: 'league' },
  { id: 78, name: 'Bundesliga', short: 'BL', country: 'Germany', tier: 2, tierLabel: 'Top 5 Leagues', type: 'league' },
  { id: 135, name: 'Serie A', short: 'SA', country: 'Italy', tier: 2, tierLabel: 'Top 5 Leagues', type: 'league' },
  { id: 61, name: 'Ligue 1', short: 'L1', country: 'France', tier: 2, tierLabel: 'Top 5 Leagues', type: 'league' },

  { id: 88, name: 'Eredivisie', short: 'ED', country: 'Netherlands', tier: 3, tierLabel: 'Other Leagues', type: 'league' },
  { id: 94, name: 'Primeira Liga', short: 'PPL', country: 'Portugal', tier: 3, tierLabel: 'Other Leagues', type: 'league' },
  { id: 144, name: 'Belgian Pro League', short: 'BPL', country: 'Belgium', tier: 3, tierLabel: 'Other Leagues', type: 'league' },
  { id: 179, name: 'Scottish Premiership', short: 'SP', country: 'Scotland', tier: 3, tierLabel: 'Other Leagues', type: 'league' },
  { id: 203, name: 'Super Lig', short: 'SL', country: 'Turkey', tier: 3, tierLabel: 'Other Leagues', type: 'league' },

  { id: 4, name: 'Euro Championship', short: 'EURO', country: 'Europe', tier: 4, tierLabel: 'International Tournaments', type: 'international' },
  { id: 9, name: 'Copa America', short: 'CA', country: 'South America', tier: 4, tierLabel: 'International Tournaments', type: 'international' },
  { id: 1, name: 'World Cup', short: 'WC', country: 'International', tier: 4, tierLabel: 'International Tournaments', type: 'international' },
  { id: 12, name: 'CONCACAF Gold Cup', short: 'GC', country: 'North America', tier: 4, tierLabel: 'International Tournaments', type: 'international' },
  { id: 117, name: 'Africa Cup of Nations', short: 'AFCON', country: 'Africa', tier: 4, tierLabel: 'International Tournaments', type: 'international' },

  { id: 45, name: 'FA Cup', short: 'FAC', country: 'England', tier: 5, tierLabel: 'Domestic Cups', type: 'cup' },
  { id: 143, name: 'Copa del Rey', short: 'CDR', country: 'Spain', tier: 5, tierLabel: 'Domestic Cups', type: 'cup' },
  { id: 81, name: 'DFB Pokal', short: 'DFB', country: 'Germany', tier: 5, tierLabel: 'Domestic Cups', type: 'cup' },
  { id: 137, name: 'Coppa Italia', short: 'CI', country: 'Italy', tier: 5, tierLabel: 'Domestic Cups', type: 'cup' },
  { id: 66, name: 'Coupe de France', short: 'CDF', country: 'France', tier: 5, tierLabel: 'Domestic Cups', type: 'cup' },
];

export const ALLOWED_LEAGUE_IDS = ALLOWED_LEAGUES.map(l => l.id);

export const TIER_1_LEAGUES = ALLOWED_LEAGUES.filter(l => l.tier === 1);
export const TIER_2_LEAGUES = ALLOWED_LEAGUES.filter(l => l.tier === 2);
export const TIER_3_LEAGUES = ALLOWED_LEAGUES.filter(l => l.tier === 3);
export const TIER_4_LEAGUES = ALLOWED_LEAGUES.filter(l => l.tier === 4);
export const TIER_5_LEAGUES = ALLOWED_LEAGUES.filter(l => l.tier === 5);

export const DEFAULT_VISIBLE_LEAGUES = [...TIER_1_LEAGUES, ...TIER_2_LEAGUES];

export const LEAGUE_TIERS = [
  { label: 'Global Tournaments', leagues: TIER_1_LEAGUES },
  { label: 'Top 5 Leagues', leagues: TIER_2_LEAGUES },
  { label: 'Other Leagues', leagues: TIER_3_LEAGUES },
  { label: 'International Tournaments', leagues: TIER_4_LEAGUES },
  { label: 'Domestic Cups', leagues: TIER_5_LEAGUES },
];

export const LEAGUE_COLORS: Record<string, string> = {
  'Premier League': 'text-red-400',
  'La Liga': 'text-yellow-400',
  'Bundesliga': 'text-red-400',
  'Serie A': 'text-green-400',
  'Ligue 1': 'text-blue-400',
  'UEFA Champions League': 'text-yellow-400',
  'UEFA Europa League': 'text-orange-400',
  'UEFA Europa Conference League': 'text-purple-400',
  'World Cup': 'text-amber-400',
  'Euro Championship': 'text-blue-400',
  'Copa America': 'text-sky-400',
  'Africa Cup of Nations': 'text-green-400',
  'FA Cup': 'text-red-400',
  'Copa del Rey': 'text-yellow-400',
  'DFB Pokal': 'text-red-400',
  'Coppa Italia': 'text-blue-400',
  'Coupe de France': 'text-purple-400',
  'Eredivisie': 'text-orange-400',
  'Primeira Liga': 'text-green-400',
  'Belgian Pro League': 'text-yellow-400',
  'Scottish Premiership': 'text-red-400',
  'Super Lig': 'text-red-400',
  'Friendly International': 'text-gray-400',
  'Club Friendlies': 'text-gray-400',
};

export function getLeagueById(id: number): LeagueConfig | undefined {
  return ALLOWED_LEAGUES.find(l => l.id === id);
}

export function getLeagueColor(name: string): string {
  return LEAGUE_COLORS[name] || 'text-gray-400';
}

export function getTierLabel(tier: number): string {
  const labels: Record<number, string> = {
    1: 'Global Tournaments',
    2: 'Top 5 Leagues',
    3: 'Other Leagues',
    4: 'International Tournaments',
    5: 'Domestic Cups',
  };
  return labels[tier] || 'Other';
}
