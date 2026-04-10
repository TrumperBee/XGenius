import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const LEAGUE_IDS = [39, 140, 78, 135, 61, 2];

interface FixtureData {
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
  status_long: string;
}

async function saveToSupabase(table: string, data: any) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('Supabase not configured, skipping database save');
    return null;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error(`Failed to save to ${table}:`, await response.text());
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error saving to ${table}:`, error);
    return null;
  }
}

async function clearOldFixtures(date: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/fixtures?date=eq.${date}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch (error) {
    console.error('Error clearing old fixtures:', error);
  }
}

async function fetchFixturesFromAPI(date: string): Promise<FixtureData[]> {
  if (!API_KEY) {
    console.log('No API key, using mock data');
    return generateMockFixtures(date);
  }

  try {
    const response = await fetch(
      `${API_BASE}/fixtures?date=${date}&timezone=UTC`,
      { headers: { 'x-apisports-key': API_KEY } }
    );

    if (!response.ok) {
      console.error('API request failed');
      return generateMockFixtures(date);
    }

    const data = await response.json();
    const apiMatches = data.response || [];

    if (apiMatches.length === 0) {
      console.log('No API matches, using mock data');
      return generateMockFixtures(date);
    }

    const matches = apiMatches.map((f: any) => ({
      id: f.fixture?.id,
      date: f.fixture?.date,
      league: f.league?.name || 'Unknown',
      league_id: f.league?.id,
      country: f.league?.country || 'Unknown',
      home_team: f.teams?.home ? {
        id: f.teams.home.id,
        name: f.teams.home.name,
        short: f.teams.home.name?.substring(0, 3).toUpperCase() || 'TBD',
        short_name: f.teams.home.name?.substring(0, 3).toUpperCase() || 'TBD',
        logo: f.teams.home.logo
      } : { id: 0, name: 'TBD', short: 'TBD', short_name: 'TBD', logo: null },
      away_team: f.teams?.away ? {
        id: f.teams.away.id,
        name: f.teams.away.name,
        short: f.teams.away.name?.substring(0, 3).toUpperCase() || 'TBD',
        short_name: f.teams.away.name?.substring(0, 3).toUpperCase() || 'TBD',
        logo: f.teams.away.logo
      } : { id: 0, name: 'TBD', short: 'TBD', short_name: 'TBD', logo: null },
      home_score: f.score?.fulltime?.home,
      away_score: f.score?.fulltime?.away,
      status: f.status?.short === 'FT' ? 'finished' : f.status?.short === 'LIVE' ? 'live' : 'scheduled',
      status_long: f.status?.long || 'Scheduled'
    }));

    return matches;
  } catch (error) {
    console.error('Error fetching from API:', error);
    return generateMockFixtures(date);
  }
}

function generateMockFixtures(date: string): FixtureData[] {
  const mockTeams = [
    { id: 50, name: 'Manchester City', short: 'MCI', short_name: 'MCI', logo: 'https://media.api-sports.io/football/teams/50.png' },
    { id: 40, name: 'Liverpool', short: 'LIV', short_name: 'LIV', logo: 'https://media.api-sports.io/football/teams/40.png' },
    { id: 66, name: 'Manchester United', short: 'MUN', short_name: 'MUN', logo: 'https://media.api-sports.io/football/teams/66.png' },
    { id: 65, name: 'Manchester City', short: 'MCI', short_name: 'MCI', logo: 'https://media.api-sports.io/football/teams/65.png' },
    { id: 33, name: 'Real Madrid', short: 'RMA', short_name: 'RMA', logo: 'https://media.api-sports.io/football/teams/33.png' },
    { id: 86, name: 'Barcelona', short: 'BAR', short_name: 'BAR', logo: 'https://media.api-sports.io/football/teams/86.png' },
    { id: 157, name: 'Bayern Munich', short: 'BAY', short_name: 'BAY', logo: 'https://media.api-sports.io/football/teams/157.png' },
    { id: 165, name: 'Borussia Dortmund', short: 'BVB', short_name: 'BVB', logo: 'https://media.api-sports.io/football/teams/165.png' },
    { id: 85, name: 'Paris Saint-Germain', short: 'PSG', short_name: 'PSG', logo: 'https://media.api-sports.io/football/teams/85.png' },
    { id: 81, name: 'Olympique Marseille', short: 'MAR', short_name: 'MAR', logo: 'https://media.api-sports.io/football/teams/81.png' },
    { id: 45, name: 'AC Milan', short: 'ACM', short_name: 'ACM', logo: 'https://media.api-sports.io/football/teams/45.png' },
    { id: 48, name: 'Inter Milan', short: 'INT', short_name: 'INT', logo: 'https://media.api-sports.io/football/teams/48.png' },
  ];

  const leagues = [
    { id: 39, name: 'Premier League', country: 'England' },
    { id: 140, name: 'La Liga', country: 'Spain' },
    { id: 78, name: 'Bundesliga', country: 'Germany' },
    { id: 135, name: 'Serie A', country: 'Italy' },
    { id: 61, name: 'Ligue 1', country: 'France' },
    { id: 2, name: 'Champions League', country: 'Europe' },
  ];

  const fixtures: FixtureData[] = [];
  const baseTime = new Date(date + 'T12:00:00Z');

  for (let i = 0; i < 8; i++) {
    const homeIdx = i % mockTeams.length;
    let awayIdx = (i + 3) % mockTeams.length;
    if (awayIdx === homeIdx) awayIdx = (awayIdx + 1) % mockTeams.length;

    const league = leagues[i % leagues.length];
    const matchTime = new Date(baseTime.getTime() + (i * 3 * 60 * 60 * 1000));
    const matchId = parseInt(date.replace(/-/g, '')) * 100 + i;

    fixtures.push({
      id: matchId,
      date: matchTime.toISOString(),
      league: league.name,
      league_id: league.id,
      country: league.country,
      home_team: mockTeams[homeIdx],
      away_team: mockTeams[awayIdx],
      home_score: null,
      away_score: null,
      status: 'scheduled',
      status_long: 'Scheduled'
    });
  }

  return fixtures;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePredictionForFixture(fixture: FixtureData) {
  const seed = fixture.id;
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed + 1);
  const r3 = seededRandom(seed + 2);
  const r4 = seededRandom(seed + 3);
  const r5 = seededRandom(seed + 4);

  const homeProb = Math.floor(r1 * 25) + 35;
  const drawProb = Math.floor(r2 * 20) + 25;
  const awayProb = 100 - homeProb - drawProb;

  let predictedWinner: 'home' | 'draw' | 'away';
  if (homeProb >= drawProb && homeProb >= awayProb) {
    predictedWinner = 'home';
  } else if (awayProb >= drawProb) {
    predictedWinner = 'away';
  } else {
    predictedWinner = 'draw';
  }

  let homeGoals: number, awayGoals: number;

  if (predictedWinner === 'home') {
    homeGoals = Math.floor(r3 * 3) + 1;
    awayGoals = Math.floor(r4 * 2);
  } else if (predictedWinner === 'away') {
    homeGoals = Math.floor(r3 * 2);
    awayGoals = Math.floor(r4 * 3) + 1;
  } else {
    homeGoals = Math.floor(r3 * 2) + 1;
    awayGoals = homeGoals;
  }

  homeGoals = Math.max(0, homeGoals);
  awayGoals = Math.max(0, awayGoals);

  const totalGoals = homeGoals + awayGoals;
  const overUnder = totalGoals > 2.5 ? 'over' : 'under';
  const btts = homeGoals > 0 && awayGoals > 0 ? 'yes' : 'no';
  const confidence = Math.floor(r5 * 25) + 60;

  return {
    match_id: fixture.id,
    date: fixture.date.split('T')[0],
    home_team: fixture.home_team.name,
    away_team: fixture.away_team.name,
    competition: fixture.league,
    predicted_winner: predictedWinner,
    predicted_home_score: homeGoals,
    predicted_away_score: awayGoals,
    confidence,
    home_win_prob: homeProb,
    draw_prob: drawProb,
    away_win_prob: awayProb,
    over_under: overUnder,
    btts,
    created_at: new Date().toISOString(),
    source: 'cron'
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const secret = searchParams.get('secret');

  const CRON_SECRET = process.env.CRON_SECRET || 'xgenius-cron-secret';
  if (secret !== CRON_SECRET && request.headers.get('x-vercel-signature') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[CRON] Fetching fixtures for ${date}`);

  try {
    await clearOldFixtures(date);

    const fixtures = await fetchFixturesFromAPI(date);
    console.log(`[CRON] Fetched ${fixtures.length} fixtures`);

    const predictions = fixtures.map(f => generatePredictionForFixture(f));
    console.log(`[CRON] Generated ${predictions.length} predictions`);

    for (const fixture of fixtures) {
      await saveToSupabase('fixtures', {
        id: fixture.id,
        date: fixture.date,
        league: fixture.league,
        league_id: fixture.league_id,
        country: fixture.country,
        home_team: fixture.home_team,
        away_team: fixture.away_team,
        home_score: fixture.home_score,
        away_score: fixture.away_score,
        status: fixture.status,
        status_long: fixture.status_long,
        fetched_at: new Date().toISOString()
      });
    }

    for (const prediction of predictions) {
      await saveToSupabase('predictions', prediction);
    }

    await saveToSupabase('cron_logs', {
      id: `cron_${date}_${Date.now()}`,
      date,
      fixtures_count: fixtures.length,
      predictions_count: predictions.length,
      executed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      date,
      fixtures_count: fixtures.length,
      predictions_count: predictions.length,
      message: `Successfully fetched ${fixtures.length} fixtures and generated ${predictions.length} predictions`
    });

  } catch (error: any) {
    console.error('[CRON] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
