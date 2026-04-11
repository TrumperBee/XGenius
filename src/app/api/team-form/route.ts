import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

async function getFromSupabase(table: string, filters?: string): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (filters) url += `?${filters}`;
    
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
  const teamId = searchParams.get('teamId');
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  if (!forceRefresh) {
    const cached = await getFromSupabase('team_form_cache', `team_id=eq.${teamId}&limit=1`);
    if (cached && cached.length > 0) {
      const data = cached[0];
      return NextResponse.json({
        success: true,
        fixtures: data.fixtures || [],
        summary: data.summary || null,
        form: data.form_data || [],
        source: 'cache'
      });
    }
  }

  try {
    const data = await fetchFromAPI(`/fixtures?team=${teamId}&last=10&status=FT`);
    const rawFixtures = data.response || [];
    
    const fixtures = rawFixtures
      .filter((f: any) => f.score?.fulltime?.home !== null)
      .slice(0, 10)
      .map((f: any) => {
        const isHome = f.teams.home.id === Number(teamId);
        const goalsFor = isHome ? f.score.fulltime.home : f.score.fulltime.away;
        const goalsAgainst = isHome ? f.score.fulltime.away : f.score.fulltime.home;
        const won = goalsFor > goalsAgainst;
        const draw = goalsFor === goalsAgainst;
        
        return {
          id: f.fixture.id,
          date: f.fixture.date,
          league: f.league.name,
          opponent: isHome ? f.teams.away.name : f.teams.home.name,
          opponentShort: (isHome ? f.teams.away.name : f.teams.home.name).substring(0, 3).toUpperCase(),
          isHome,
          home_score: f.score.fulltime.home ?? 0,
          away_score: f.score.fulltime.away ?? 0,
          goalsFor,
          goalsAgainst,
          result: won ? 'W' : draw ? 'D' : 'L'
        };
      });

    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        fixtures: [],
        summary: null,
        form: [],
        source: 'api'
      });
    }

    const wins = fixtures.filter((f: any) => f.result === 'W').length;
    const draws = fixtures.filter((f: any) => f.result === 'D').length;
    const losses = fixtures.filter((f: any) => f.result === 'L').length;

    return NextResponse.json({
      success: true,
      fixtures,
      summary: {
        total: fixtures.length,
        wins,
        draws,
        losses,
        goalsFor: fixtures.reduce((sum: number, f: any) => sum + f.goalsFor, 0),
        goalsAgainst: fixtures.reduce((sum: number, f: any) => sum + f.goalsAgainst, 0),
        cleanSheets: fixtures.filter((f: any) => f.goalsAgainst === 0).length
      },
      form: fixtures.slice(0, 5).map((f: any) => f.result),
      source: 'api'
    });

  } catch (error) {
    console.error('Team form error:', error);
    return NextResponse.json({
      success: false,
      fixtures: [],
      summary: null,
      form: [],
      source: 'error'
    });
  }
}
