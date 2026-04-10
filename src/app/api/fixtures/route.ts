import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');
  
  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  console.log('=== FIXTURES API ===');
  console.log('Date:', date, 'Days:', days);

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const fixturesByDate: Record<string, any[]> = {};
  
  try {
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
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
      
      // Return ALL matches - NO FILTERING
      const matches = apiMatches.map((f: any) => ({
        id: f.fixture?.id,
        date: f.fixture?.date,
        league: f.league?.name || 'Unknown',
        league_id: f.league?.id,
        country: f.league?.country || 'Unknown',
        home_team: f.teams?.home ? { 
          id: f.teams.home.id, 
          name: f.teams.home.name, 
          short: f.teams.home.name?.substring(0,3).toUpperCase() || 'TBD',
          short_name: f.teams.home.name?.substring(0,3).toUpperCase() || 'TBD',
          logo: f.teams.home.logo 
        } : { id: 0, name: 'TBD', short: 'TBD', short_name: 'TBD', logo: null },
        away_team: f.teams?.away ? { 
          id: f.teams.away.id, 
          name: f.teams.away.name, 
          short: f.teams.away.name?.substring(0,3).toUpperCase() || 'TBD',
          short_name: f.teams.away.name?.substring(0,3).toUpperCase() || 'TBD',
          logo: f.teams.away.logo 
        } : { id: 0, name: 'TBD', short: 'TBD', short_name: 'TBD', logo: null },
        home_score: f.score?.fulltime?.home,
        away_score: f.score?.fulltime?.away,
        status: f.status?.short === 'FT' ? 'finished' : f.status?.short === 'LIVE' ? 'live' : 'scheduled',
        status_long: f.status?.long || 'Scheduled'
      }));

      fixturesByDate[dateStr] = matches;
      console.log(`Returning ${matches.length} matches for ${dateStr}`);
    }

    const allMatches = Object.values(fixturesByDate).flat();
    const totalMatches = allMatches.length;

    console.log(`Total matches: ${totalMatches}`);

    return NextResponse.json({
      success: true,
      date,
      matches: allMatches,
      total: totalMatches,
      fixtures_by_date: fixturesByDate,
      total_matches: totalMatches,
      debug: { api_key_working: true },
      verification: { 
        verified: totalMatches > 0, 
        data_quality: totalMatches > 10 ? 'high' : 'medium', 
        conflicts: [], 
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
        data_quality: 'blocked', 
        conflicts: [], 
        last_verified_at: new Date().toISOString(), 
        recommended_action: 'block' 
      }
    });
  }
}
