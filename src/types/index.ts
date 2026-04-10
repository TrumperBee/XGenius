export interface League {
  id: number;
  name: string;
  country: string;
  logo?: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  league_id: number;
  logo?: string;
  elo_rating: number;
}

export interface Match {
  id: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  status: 'scheduled' | 'live' | 'finished';
  start_time: string;
  venue?: string;
}

export interface Prediction {
  id: number;
  match_id: number;
  predicted_winner: 'home' | 'draw' | 'away';
  home_probability: number;
  draw_probability: number;
  away_probability: number;
  expected_home_goals: number;
  expected_away_goals: number;
  confidence_score: number;
  over_2_5_probability: number;
  insights: string[];
  value_bet?: {
    exists: boolean;
    bet: string;
    ev_percent: number;
  };
}

export interface TeamForm {
  team_id: number;
  match_date: string;
  wins: number;
  draws: number;
  losses: number;
  goals_scored: number;
  goals_conceded: number;
  form_score: number;
}

export interface Injury {
  id: number;
  team_id: number;
  player_name: string;
  position: string;
  status: string;
  expected_return?: string;
  impact_score: number;
}

export interface HeadToHead {
  id: number;
  home_team_id: number;
  away_team_id: number;
  match_date: string;
  home_score: number;
  away_score: number;
  competition: string;
}

export interface PerformanceLog {
  id: number;
  date: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy_percentage: number;
  roi_percentage: number;
}

export interface MatchWithPrediction extends Match {
  league?: League;
  home_team?: Team;
  away_team?: Team;
  prediction?: Prediction;
}

export interface DashboardStats {
  yesterday_accuracy: number;
  total_predictions_today: number;
  weekly_accuracy: number;
  monthly_accuracy: number;
  best_league: string;
  worst_league: string;
  roi: number;
}
