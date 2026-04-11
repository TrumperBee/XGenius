import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const TOP_LEAGUE_IDS = [39, 140, 78, 135, 61, 2, 3, 848, 88, 94];

async function getFromSupabase(date: string): Promise<any[] | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const url = `${SUPABASE_URL}/rest/v1/fixtures_cache?date=gte.${date}T00:00:00&date=lte.${date}T23:59:59&select=*`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchFromAPI(path: string): Promise<any> {
  if (!API_KEY) throw new Error('API key not configured');
  
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) throw new Error('API error');
  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');
  const forceRefresh = searchParams.get('refresh') === 'true';

  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  const fixturesByDate: Record<string, any[]> = {};

  if (!forceRefresh) {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const cached = await getFromSupabase(dateStr);
      if (cached && cached.length > 0) {
        fixturesByDate[dateStr] = cached.map((f: any) => ({
          id: f.id,
          date: f.date,
          league: f.league,
          league_id: f.league_id,
          country: f.country,
          home_team: f.home_team,
          away_team: f.away_team,
          home_score: f.home_score,
          away_score: f.away_score,
          status: f.status,
          status_long: f.status_long
        }));
      }
    }

    const cachedCount = Object.values(fixturesByDate).flat().length;
    if (cachedCount > 0) {
      console.log(`[CACHE] Returning ${cachedCount} fixtures from Supabase`);
      
      return NextResponse.json({
        success: true,
        date,
        matches: Object.values(fixturesByDate).flat(),
        total: cachedCount,
        source: 'supabase'
      });
    }
  }

  try {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const data = await fetchFromAPI(`/fixtures?date=${dateStr}&timezone=UTC`);
      const apiMatches = data.response || [];

      const matches = apiMatches
        .filter((f: any) => TOP_LEAGUE_IDS.includes(f.league.id))
        .map((f: any) => ({
          id: f.fixture.id,
          date: f.fixture.date,
          league: f.league.name,
          league_id: f.league.id,
          country: f.league.country,
          home_team: {
            id: f.teams.home.id,
            name: f.teams.home.name,
            short: f.teams.home.name?.substring(0, 3).toUpperCase(),
            logo: f.teams.home.logo
          },
          away_team: {
            id: f.teams.away.id,
            name: f.teams.away.name,
            short: f.teams.away.name?.substring(0, 3).toUpperCase(),
            logo: f.teams.away.logo
          },
          home_score: f.score?.fulltime?.home,
          away_score: f.score?.fulltime?.away,
          status: f.status?.short === 'FT' ? 'finished' : f.status?.short === 'LIVE' ? 'live' : 'scheduled',
          status_long: f.status?.long
        }));

      fixturesByDate[dateStr] = matches;
      await new Promise(r => setTimeout(r, 200));
    }

    const allMatches = Object.values(fixturesByDate).flat();

    return NextResponse.json({
      success: true,
      date,
      matches: allMatches,
      total: allMatches.length,
      source: 'api'
    });

  } catch (error: any) {
    console.error('Fixtures error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      matches: [],
      source: 'error'
    });
  }
}
