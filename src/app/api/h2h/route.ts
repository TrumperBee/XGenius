import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function getFromSupabase(team1: number, team2: number): Promise<any | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const minId = Math.min(team1, team2);
  const maxId = Math.max(team1, team2);

  try {
    const url = `${SUPABASE_URL}/rest/v1/h2h_cache?team1_id=eq.${minId}&team2_id=eq.${maxId}&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function saveToSupabase(data: any) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/h2h_cache`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error(`Save error for h2h_cache:`, e);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'team1 and team2 required' }, { status: 400 });
  }

  const cached = await getFromSupabase(Number(team1), Number(team2));
  if (cached) {
    return NextResponse.json({
      success: true,
      has_history: true,
      fixtures: cached.fixtures || [],
      summary: cached.summary || null,
      source: 'database'
    });
  }

  if (!API_KEY) {
    return NextResponse.json({
      success: false,
      has_history: false,
      fixtures: [],
      summary: null,
      source: 'no_api'
    });
  }

  try {
    const response = await fetch(
      `${API_BASE}/fixtures?h2h=${team1}-${team2}&last=10`,
      { 
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(10000)
      }
    );

    if (!response.ok) throw new Error('H2H API error');

    const data = await response.json();
    const rawFixtures = data.response || [];
    
    const fixtures = rawFixtures
      .filter((f: any) => f.score?.fulltime?.home !== null)
      .map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        competition: f.league.name,
        home_team: { 
          id: f.teams.home.id, 
          name: f.teams.home.name, 
          short: f.teams.home.name.substring(0, 3).toUpperCase(),
          logo: f.teams.home.logo
        },
        away_team: { 
          id: f.teams.away.id, 
          name: f.teams.away.name, 
          short: f.teams.away.name.substring(0, 3).toUpperCase(),
          logo: f.teams.away.logo
        },
        home_score: f.score.fulltime.home ?? 0,
        away_score: f.score.fulltime.away ?? 0,
        winner: f.score.fulltime.home > f.score.fulltime.away ? 'home' : 
                 f.score.fulltime.away > f.score.fulltime.home ? 'away' : 'draw'
      }));

    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        has_history: false,
        fixtures: [],
        summary: null,
        source: 'api'
      });
    }

    const homeWins = fixtures.filter((f: any) => f.winner === 'home').length;
    const awayWins = fixtures.filter((f: any) => f.winner === 'away').length;
    const draws = fixtures.filter((f: any) => f.winner === 'draw').length;

    const summary = {
      total: fixtures.length,
      home_wins: homeWins,
      away_wins: awayWins,
      draws,
      goals: { 
        home: fixtures.reduce((sum: number, f: any) => sum + (f.home_score || 0), 0), 
        away: fixtures.reduce((sum: number, f: any) => sum + (f.away_score || 0), 0) 
      }
    };

    const minId = Math.min(Number(team1), Number(team2));
    const maxId = Math.max(Number(team1), Number(team2));
    
    await saveToSupabase({
      team1_id: minId,
      team2_id: maxId,
      fixtures,
      summary
    });

    return NextResponse.json({
      success: true,
      has_history: true,
      fixtures,
      summary,
      source: 'api'
    });

  } catch (error) {
    console.error('H2H fetch error:', error);
    return NextResponse.json({
      success: false,
      has_history: false,
      fixtures: [],
      summary: null,
      source: 'error'
    });
  }
}
