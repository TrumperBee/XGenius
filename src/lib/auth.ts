import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createBrowserClient(supabaseUrl!, supabaseKey!);

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface FavoriteTeam {
  id: number;
  team_id: number;
  team_name: string;
  team_short_name: string;
  logo?: string;
}

export interface SavedPrediction {
  id: number;
  user_id: string;
  match_id: number;
  home_team: string;
  away_team: string;
  predicted_winner: 'home' | 'draw' | 'away';
  predicted_score: string;
  predicted_home_goals: number;
  predicted_away_goals: number;
  confidence: number;
  over_under: 'over' | 'under';
  btts: 'yes' | 'no';
  league: string;
  created_at: string;
}

export interface MatchPoll {
  match_id: number;
  home_votes: number;
  draw_votes: number;
  away_votes: number;
  total_votes: number;
  predicted_scores: { score: string; votes: number }[];
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  });
  return { data, error };
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/dashboard` }
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  let fullName = user.email?.split('@')[0] || 'User';
  let avatarUrl: string | undefined;
  
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      fullName = profile.full_name || fullName;
      avatarUrl = profile.avatar_url;
    }
  } catch (e) {
    // profiles table might not exist yet
  }
  
  return {
    id: user.id,
    email: user.email || '',
    full_name: fullName,
    avatar_url: avatarUrl || user.user_metadata?.avatar_url
  };
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

export async function getFavorites(userId: string): Promise<FavoriteTeam[]> {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.warn('Error fetching favorites:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('Exception fetching favorites:', e);
    return [];
  }
}

export async function addFavorite(userId: string, teamId: number, teamName: string, shortName: string, logo?: string) {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .upsert({ 
        user_id: userId, 
        team_id: teamId, 
        team_name: teamName, 
        team_short_name: shortName, 
        logo,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  } catch (e) {
    console.warn('Exception adding favorite:', e);
    return { data: null, error: e };
  }
}

export async function removeFavorite(userId: string, teamId: number) {
  try {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', teamId);
    return { error };
  } catch (e) {
    return { error: e };
  }
}

export async function savePrediction(prediction: Omit<SavedPrediction, 'id' | 'created_at'>) {
  try {
    const { data, error } = await supabase
      .from('saved_predictions')
      .upsert({
        ...prediction,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    return { data, error };
  } catch (e) {
    console.warn('Exception saving prediction:', e);
    return { data: null, error: e };
  }
}

export async function getSavedPredictions(userId: string): Promise<SavedPrediction[]> {
  try {
    const { data, error } = await supabase
      .from('saved_predictions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Error fetching predictions:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('Exception fetching predictions:', e);
    return [];
  }
}

export async function removeSavedPrediction(userId: string, matchId: number) {
  try {
    const { error } = await supabase
      .from('saved_predictions')
      .delete()
      .eq('user_id', userId)
      .eq('match_id', matchId);
    return { error };
  } catch (e) {
    return { error: e };
  }
}

export async function getMatchPoll(matchId: number): Promise<MatchPoll | null> {
  try {
    const { data, error } = await supabase
      .from('match_polls')
      .select('*')
      .eq('match_id', matchId)
      .single();
    
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export async function voteOnMatch(userId: string, matchId: number, vote: 'home' | 'draw' | 'away', predictedScore: string) {
  try {
    const { data: existing } = await supabase
      .from('match_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('match_votes')
        .update({ vote, predicted_score: predictedScore })
        .eq('user_id', userId)
        .eq('match_id', matchId);
      
      if (existing.vote !== vote) {
        const increment = existing.vote === 'home' ? { home_votes: -1 } :
                         existing.vote === 'draw' ? { draw_votes: -1 } :
                         { away_votes: -1 };
        await supabase.rpc('increment_votes', { m_id: matchId, ...increment });
        
        const decrement = vote === 'home' ? { home_votes: 1 } :
                         vote === 'draw' ? { draw_votes: 1 } :
                         { away_votes: 1 };
        await supabase.rpc('increment_votes', { m_id: matchId, ...decrement });
      }
      
      return { error };
    } else {
      const { error } = await supabase
        .from('match_votes')
        .insert({ user_id: userId, match_id: matchId, vote, predicted_score: predictedScore });
      
      const increment = vote === 'home' ? { home_votes: 1 } :
                       vote === 'draw' ? { draw_votes: 1 } :
                       { away_votes: 1 };
      await supabase.rpc('increment_votes', { m_id: matchId, ...increment });
      
      await supabase.rpc('increment_total_votes', { m_id: matchId });
      
      return { error };
    }
  } catch (e) {
    return { error: e };
  }
}

export async function getUserVote(userId: string, matchId: number) {
  try {
    const { data } = await supabase
      .from('match_votes')
      .select('*')
      .eq('user_id', userId)
      .eq('match_id', matchId)
      .single();
    return data;
  } catch (e) {
    return null;
  }
}
