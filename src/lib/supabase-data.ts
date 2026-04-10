import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl!, supabaseKey!);

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
  status: string;
  start_time: string;
  venue?: string;
}

export interface Prediction {
  id: number;
  match_id: number;
  predicted_winner: string;
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

export async function fetchLeagues(): Promise<League[]> {
  try {
    const { data, error } = await supabaseAdmin.from('leagues').select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.log('Using mock leagues');
    return (await import('@/data/mockData')).mockLeagues;
  }
}

export async function fetchTeams(): Promise<Team[]> {
  try {
    const { data, error } = await supabaseAdmin.from('teams').select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.log('Using mock teams');
    return (await import('@/data/mockData')).mockTeams;
  }
}

export async function fetchMatches(date?: string): Promise<Match[]> {
  try {
    let query = supabaseAdmin.from('matches').select('*');
    if (date) {
      query = query.gte('start_time', date).lt('start_time', date + 'T23:59:59');
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.log('Using mock matches');
    return (await import('@/data/mockData')).mockMatches;
  }
}

export async function fetchPredictions(matchIds: number[]): Promise<Prediction[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .in('match_id', matchIds);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.log('Using mock predictions');
    return (await import('@/data/mockData')).mockPredictions;
  }
}

export async function fetchPerformanceLogs(days: number = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabaseAdmin
      .from('performance_logs')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.log('Using mock performance logs');
    return (await import('@/data/mockData')).mockPerformanceLogs;
  }
}

export async function savePrediction(prediction: Omit<Prediction, 'id'>) {
  try {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .insert(prediction)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to save prediction:', e);
    return null;
  }
}

export async function saveMatchResult(matchId: number, homeScore: number, awayScore: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
      .eq('id', matchId)
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to save match result:', e);
    return null;
  }
}

export async function logPerformance(total: number, correct: number, roi: number) {
  try {
    const { data, error } = await supabaseAdmin
      .from('performance_logs')
      .insert({
        date: new Date().toISOString().split('T')[0],
        total_predictions: total,
        correct_predictions: correct,
        accuracy_percentage: Math.round((correct / total) * 100),
        roi_percentage: roi
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    console.error('Failed to log performance:', e);
    return null;
  }
}
