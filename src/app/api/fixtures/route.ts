import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function fetchFromSupabase(table: string, filters?: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
    if (filters) url += `&${filters}`;

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from Supabase ${table}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');

  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  console.log('=== FIXTURES API ===');
  console.log('Date:', date, 'Days:', days);

  const fixturesByDate: Record<string, any[]> = {};

  try {
    const storedFixtures = await fetchFromSupabase('fixtures', `date=like.${date}*&order=date.asc`);

    if (storedFixtures && storedFixtures.length > 0) {
      console.log(`[CACHE] Found ${storedFixtures.length} fixtures in database`);

      for (const fixture of storedFixtures) {
        const fixtureDate = fixture.date?.split('T')[0];
        if (!fixtureDate) continue;

        if (!fixturesByDate[fixtureDate]) {
          fixturesByDate[fixtureDate] = [];
        }

        try {
          fixturesByDate[fixtureDate].push({
            id: fixture.id,
            date: fixture.date,
            league: fixture.league,
            league_id: fixture.league_id,
            country: fixture.country,
            home_team: typeof fixture.home_team === 'string' ? JSON.parse(fixture.home_team) : fixture.home_team,
            away_team: typeof fixture.away_team === 'string' ? JSON.parse(fixture.away_team) : fixture.away_team,
            home_score: fixture.home_score,
            away_score: fixture.away_score,
            status: fixture.status,
            status_long: fixture.status_long
          });
        } catch (e) {
          fixturesByDate[fixtureDate].push(fixture);
        }
      }

      const allMatches = Object.values(fixturesByDate).flat();
      const totalMatches = allMatches.length;

      console.log(`Returning ${totalMatches} fixtures from cache`);

      return NextResponse.json({
        success: true,
        date,
        matches: allMatches,
        total: totalMatches,
        fixtures_by_date: fixturesByDate,
        total_matches: totalMatches,
        source: 'database',
        debug: { api_key_working: true, cached: true }
      });
    }

    console.log('[API] No cached fixtures, fetching from API...');

    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      if (!fixturesByDate[dateStr]) {
        fixturesByDate[dateStr] = [];
      }

      if (!API_KEY) {
        console.log('No API key, returning empty');
        continue;
      }

      const response = await fetch(
        `${API_BASE}/fixtures?date=${dateStr}&timezone=UTC`,
        {
          headers: { 'x-apisports-key': API_KEY },
          cache: 'no-store'
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const apiMatches = data.response || [];

      console.log(`API returned ${apiMatches.length} matches for ${dateStr}`);

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

      fixturesByDate[dateStr] = matches;
    }

    const allMatches = Object.values(fixturesByDate).flat();
    const totalMatches = allMatches.length;

    console.log(`Total matches: ${totalMatches}`);

    const friendlyMessage = totalMatches === 0 ? {
      title: 'No matches available',
      subtitle: 'There are no scheduled matches for the selected date. This could be an off-day or the API rate limit has been reached.',
      suggestions: [
        'Try selecting a different date',
        'Check back during peak match hours (afternoon/evening)',
        'The data refreshes daily at 09:00 UTC'
      ]
    } : undefined;

    return NextResponse.json({
      success: true,
      date,
      matches: allMatches,
      total: totalMatches,
      fixtures_by_date: fixturesByDate,
      total_matches: totalMatches,
      source: 'api',
      debug: { api_key_working: true, cached: false },
      friendly_message: friendlyMessage,
      verification: {
        verified: totalMatches > 0,
        data_quality: totalMatches > 10 ? 'high' : 'medium',
        last_verified_at: new Date().toISOString(),
        recommended_action: totalMatches > 0 ? 'show' : 'block'
      }
    });

  } catch (error: any) {
    console.log('Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
      matches: [],
      fixtures_by_date: {},
      total_matches: 0,
      verification: {
        verified: false,
        data_quality: 'error',
        last_verified_at: new Date().toISOString(),
        recommended_action: 'block'
      }
    });
  }
}
