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
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return {
    id: user.id,
    email: user.email || '',
    full_name: profile?.full_name || user.email?.split('@')[0],
    avatar_url: profile?.avatar_url
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
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId);
  
  if (error) return [];
  return data || [];
}

export async function addFavorite(userId: string, teamId: number, teamName: string, shortName: string, logo?: string) {
  const { data, error } = await supabase
    .from('user_favorites')
    .insert({ user_id: userId, team_id: teamId, team_name: teamName, team_short_name: shortName, logo })
    .select()
    .single();
  return { data, error };
}

export async function removeFavorite(userId: string, teamId: number) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId);
  return { error };
}
