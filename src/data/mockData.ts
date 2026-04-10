import { League, Team, Match, Prediction, Injury, HeadToHead, TeamForm, PerformanceLog } from '@/types';

export const mockLeagues: League[] = [
  { id: 1, name: 'Premier League', country: 'England', logo: 'https://cdn.worldvectorlogo.com/logos/premier-league-1.svg' },
  { id: 2, name: 'La Liga', country: 'Spain', logo: 'https://cdn.worldvectorlogo.com/logos/la-liga.svg' },
  { id: 3, name: 'Bundesliga', country: 'Germany', logo: 'https://cdn.worldvectorlogo.com/logos/bundesliga.svg' },
  { id: 4, name: 'Serie A', country: 'Italy', logo: 'https://cdn.worldvectorlogo.com/logos/serie-a.svg' },
  { id: 5, name: 'Ligue 1', country: 'France', logo: 'https://cdn.worldvectorlogo.com/logos/ligue-1.svg' },
  { id: 6, name: 'Champions League', country: 'Europe', logo: 'https://cdn.worldvectorlogo.com/logos/uefa-champions-league.svg' },
];

export const mockTeams: Team[] = [
  { id: 1, name: 'Manchester City', short_name: 'MCI', league_id: 1, elo_rating: 1892 },
  { id: 2, name: 'Liverpool', short_name: 'LIV', league_id: 1, elo_rating: 1856 },
  { id: 3, name: 'Arsenal', short_name: 'ARS', league_id: 1, elo_rating: 1823 },
  { id: 4, name: 'Chelsea', short_name: 'CHE', league_id: 1, elo_rating: 1798 },
  { id: 5, name: 'Manchester United', short_name: 'MUN', league_id: 1, elo_rating: 1765 },
  { id: 6, name: 'Tottenham', short_name: 'TOT', league_id: 1, elo_rating: 1778 },
  { id: 7, name: 'Barcelona', short_name: 'BAR', league_id: 2, elo_rating: 1845 },
  { id: 8, name: 'Real Madrid', short_name: 'RMA', league_id: 2, elo_rating: 1889 },
  { id: 9, name: 'Atletico Madrid', short_name: 'ATM', league_id: 2, elo_rating: 1812 },
  { id: 10, name: 'Bayern Munich', short_name: 'BAY', league_id: 3, elo_rating: 1876 },
  { id: 11, name: 'Borussia Dortmund', short_name: 'BVB', league_id: 3, elo_rating: 1801 },
  { id: 12, name: 'Inter Milan', short_name: 'INT', league_id: 4, elo_rating: 1829 },
  { id: 13, name: 'AC Milan', short_name: 'MIL', league_id: 4, elo_rating: 1798 },
  { id: 14, name: 'PSG', short_name: 'PSG', league_id: 5, elo_rating: 1834 },
  { id: 15, name: 'Marseille', short_name: 'MAR', league_id: 5, elo_rating: 1776 },
  { id: 16, name: 'Monaco', short_name: 'MON', league_id: 5, elo_rating: 1789 },
];

export const mockMatches: Match[] = [
  { id: 1, league_id: 1, home_team_id: 1, away_team_id: 2, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T20:00:00Z', venue: 'Etihad Stadium' },
  { id: 2, league_id: 1, home_team_id: 3, away_team_id: 4, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T15:00:00Z', venue: 'Emirates Stadium' },
  { id: 3, league_id: 1, home_team_id: 5, away_team_id: 6, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T12:30:00Z', venue: 'Old Trafford' },
  { id: 4, league_id: 2, home_team_id: 7, away_team_id: 8, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T19:00:00Z', venue: 'Camp Nou' },
  { id: 5, league_id: 2, home_team_id: 9, away_team_id: 7, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-08T20:00:00Z', venue: 'Wanda Metropolitano' },
  { id: 6, league_id: 3, home_team_id: 10, away_team_id: 11, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T17:30:00Z', venue: 'Allianz Arena' },
  { id: 7, league_id: 4, home_team_id: 12, away_team_id: 13, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T19:45:00Z', venue: 'San Siro' },
  { id: 8, league_id: 5, home_team_id: 14, away_team_id: 15, home_score: 0, away_score: 0, status: 'scheduled', start_time: '2026-04-07T20:00:00Z', venue: 'Parc des Princes' },
  { id: 9, league_id: 1, home_team_id: 2, away_team_id: 3, home_score: 2, away_score: 1, status: 'finished', start_time: '2026-04-05T16:00:00Z', venue: 'Anfield' },
  { id: 10, league_id: 1, home_team_id: 4, away_team_id: 1, home_score: 1, away_score: 3, status: 'finished', start_time: '2026-04-05T14:00:00Z', venue: 'Stamford Bridge' },
];

export const mockPredictions: Prediction[] = [
  {
    id: 1,
    match_id: 1,
    predicted_winner: 'home',
    home_probability: 48,
    draw_probability: 27,
    away_probability: 25,
    expected_home_goals: 1.9,
    expected_away_goals: 1.4,
    confidence_score: 72,
    over_2_5_probability: 68,
    insights: [
      "City's home form (85% wins) vs Liverpool's away struggles (40% wins)",
      "Liverpool missing 2 key defenders (injury impact -12% defense)",
      "Last 5 H2H: 3 overs, 2 unders → leaning goals"
    ],
    value_bet: { exists: true, bet: 'Over 2.5', ev_percent: 12.4 }
  },
  {
    id: 2,
    match_id: 2,
    predicted_winner: 'home',
    home_probability: 52,
    draw_probability: 25,
    away_probability: 23,
    expected_home_goals: 2.1,
    expected_away_goals: 1.3,
    confidence_score: 68,
    over_2_5_probability: 71,
    insights: [
      "Arsenal won 4 of last 5 home matches",
      "Chelsea's away form: only 2 wins in last 8",
      "Saka in top form (3 goals in last 3 games)"
    ]
  },
  {
    id: 3,
    match_id: 3,
    predicted_winner: 'away',
    home_probability: 35,
    draw_probability: 28,
    away_probability: 37,
    expected_home_goals: 1.5,
    expected_away_goals: 1.8,
    confidence_score: 54,
    over_2_5_probability: 52,
    insights: [
      "Tottenham's attacking away form (12 goals in last 5 away)",
      "United defense struggling (8 goals conceded in last 3)"
    ],
    value_bet: { exists: true, bet: 'BTTS', ev_percent: 8.2 }
  },
  {
    id: 4,
    match_id: 4,
    predicted_winner: 'draw',
    home_probability: 32,
    draw_probability: 41,
    away_probability: 27,
    expected_home_goals: 1.6,
    expected_away_goals: 1.5,
    confidence_score: 65,
    over_2_5_probability: 48,
    insights: [
      "El Clasico: tight historically (5 draws in last 10)",
      "Barcelona's attacking form vs Real's defensive solidity",
      "Both teams missing key players"
    ]
  },
  {
    id: 5,
    match_id: 5,
    predicted_winner: 'away',
    home_probability: 38,
    draw_probability: 29,
    away_probability: 33,
    expected_home_goals: 1.4,
    expected_away_goals: 1.6,
    confidence_score: 48,
    over_2_5_probability: 45,
    insights: [
      "Madrid derby: high variance",
      "Atletico home advantage significant"
    ]
  },
  {
    id: 6,
    match_id: 6,
    predicted_winner: 'home',
    home_probability: 61,
    draw_probability: 22,
    away_probability: 17,
    expected_home_goals: 2.4,
    expected_away_goals: 1.1,
    confidence_score: 78,
    over_2_5_probability: 72,
    insights: [
      "Bayern home domination (90% win rate this season)",
      "Dortmund inconsistent away",
      "Kane vs defensive vulnerabilities"
    ]
  },
  {
    id: 7,
    match_id: 7,
    predicted_winner: 'home',
    home_probability: 45,
    draw_probability: 32,
    away_probability: 23,
    expected_home_goals: 1.8,
    expected_away_goals: 1.3,
    confidence_score: 58,
    over_2_5_probability: 55,
    insights: [
      "Milan derby: unpredictable",
      "Inter slight edge in recent form"
    ]
  },
  {
    id: 8,
    match_id: 8,
    predicted_winner: 'home',
    home_probability: 55,
    draw_probability: 25,
    away_probability: 20,
    expected_home_goals: 2.0,
    expected_away_goals: 1.4,
    confidence_score: 66,
    over_2_5_probability: 62,
    insights: [
      "PSG strong at Parc des Princes",
      "Marseille's away struggles (30% win rate)"
    ]
  }
];

export const mockInjuries: Injury[] = [
  { id: 1, team_id: 2, player_name: 'Virgil van Dijk', position: 'DEF', status: 'doubtful', impact_score: 12 },
  { id: 2, team_id: 2, player_name: 'Trent Alexander-Arnold', position: 'DEF', status: 'out', impact_score: 15 },
  { id: 3, team_id: 7, player_name: 'Pedri', position: 'MID', status: 'doubtful', impact_score: 8 },
  { id: 4, team_id: 8, player_name: 'Thibaut Courtois', position: 'GK', status: 'out', impact_score: 10 },
];

export const mockHeadToHeads: HeadToHead[] = [
  { id: 1, home_team_id: 1, away_team_id: 2, match_date: '2025-11-23', home_score: 2, away_score: 2, competition: 'Premier League' },
  { id: 2, home_team_id: 1, away_team_id: 2, match_date: '2025-03-01', home_score: 1, away_score: 0, competition: 'Premier League' },
  { id: 3, home_team_id: 1, away_team_id: 2, match_date: '2024-12-15', home_score: 3, away_score: 1, competition: 'Premier League' },
  { id: 4, home_team_id: 7, away_team_id: 8, match_date: '2025-10-20', home_score: 2, away_score: 2, competition: 'La Liga' },
  { id: 5, home_team_id: 7, away_team_id: 8, match_date: '2025-05-11', home_score: 3, away_score: 2, competition: 'La Liga' },
  { id: 6, home_team_id: 10, away_team_id: 11, match_date: '2025-11-30', home_score: 4, away_score: 2, competition: 'Bundesliga' },
  { id: 7, home_team_id: 12, away_team_id: 13, match_date: '2025-09-22', home_score: 1, away_score: 1, competition: 'Serie A' },
];

export const mockTeamForms: TeamForm[] = [
  { team_id: 1, match_date: '2026-04-06', wins: 4, draws: 1, losses: 0, goals_scored: 12, goals_conceded: 3, form_score: 92 },
  { team_id: 2, match_date: '2026-04-06', wins: 3, draws: 1, losses: 1, goals_scored: 9, goals_conceded: 5, form_score: 78 },
  { team_id: 3, match_date: '2026-04-06', wins: 4, draws: 0, losses: 1, goals_scored: 11, goals_conceded: 4, form_score: 88 },
  { team_id: 4, match_date: '2026-04-06', wins: 2, draws: 2, losses: 1, goals_scored: 7, goals_conceded: 6, form_score: 62 },
  { team_id: 7, match_date: '2026-04-06', wins: 3, draws: 1, losses: 1, goals_scored: 10, goals_conceded: 5, form_score: 76 },
  { team_id: 8, match_date: '2026-04-06', wins: 4, draws: 1, losses: 0, goals_scored: 13, goals_conceded: 2, form_score: 94 },
  { team_id: 10, match_date: '2026-04-06', wins: 5, draws: 0, losses: 0, goals_scored: 18, goals_conceded: 2, form_score: 100 },
  { team_id: 11, match_date: '2026-04-06', wins: 2, draws: 2, losses: 1, goals_scored: 8, goals_conceded: 7, form_score: 58 },
];

export const mockPerformanceLogs: PerformanceLog[] = [
  { id: 1, date: '2026-04-06', total_predictions: 25, correct_predictions: 17, accuracy_percentage: 68, roi_percentage: 12.4 },
  { id: 2, date: '2026-04-05', total_predictions: 22, correct_predictions: 14, accuracy_percentage: 63.6, roi_percentage: 8.2 },
  { id: 3, date: '2026-04-04', total_predictions: 18, correct_predictions: 13, accuracy_percentage: 72.2, roi_percentage: 15.8 },
  { id: 4, date: '2026-04-03', total_predictions: 20, correct_predictions: 12, accuracy_percentage: 60, roi_percentage: -2.5 },
  { id: 5, date: '2026-04-02', total_predictions: 24, correct_predictions: 16, accuracy_percentage: 66.7, roi_percentage: 9.1 },
  { id: 6, date: '2026-04-01', total_predictions: 21, correct_predictions: 15, accuracy_percentage: 71.4, roi_percentage: 14.2 },
  { id: 7, date: '2026-03-31', total_predictions: 19, correct_predictions: 14, accuracy_percentage: 73.7, roi_percentage: 18.6 },
];

export const weeklyStats = {
  accuracy: 71,
  totalPredictions: 149,
  correctPredictions: 106,
  bestLeague: 'Bundesliga',
  bestLeagueAccuracy: 82,
  worstLeague: 'Ligue 1',
  worstLeagueAccuracy: 54,
  roi: 11.2,
  days: [
    { date: '2026-03-31', accuracy: 73.7, predictions: 19 },
    { date: '2026-04-01', accuracy: 71.4, predictions: 21 },
    { date: '2026-04-02', accuracy: 66.7, predictions: 24 },
    { date: '2026-04-03', accuracy: 60, predictions: 20 },
    { date: '2026-04-04', accuracy: 72.2, predictions: 18 },
    { date: '2026-04-05', accuracy: 63.6, predictions: 22 },
    { date: '2026-04-06', accuracy: 68, predictions: 25 },
  ]
};
