import { NextResponse } from 'next/server';
import { fetchTeams, fetchMatches, saveMatchResult, logPerformance } from '@/lib/data';

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

async function fetchWithKey(url: string) {
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': FOOTBALL_API_KEY!
    }
  });
  return response.json();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'fixtures': {
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
        const response = await fetchWithKey(
          `${API_BASE}/fixtures?date=${date}&status=NS-FT`
        );
        
        const fixtures = response.response || [];
        
        for (const fixture of fixtures) {
          const match = {
            league_id: fixture.league.id,
            home_team_id: fixture.teams.home.id,
            away_team_id: fixture.teams.away.id,
            home_score: fixture.score.fulltime.home || 0,
            away_score: fixture.score.fulltime.away || 0,
            status: fixture.fixture.status.short === 'FT' ? 'finished' : 
                    fixture.fixture.status.short === 'LIVE' ? 'live' : 'scheduled',
            start_time: fixture.fixture.date,
            venue: fixture.fixture.venue?.name
          };
          console.log('Fixture:', fixture.teams.home.name, 'vs', fixture.teams.away.name);
        }
        
        return NextResponse.json({ success: true, count: fixtures.length });
      }

      case 'teams': {
        const leagueId = searchParams.get('league') || '39';
        const response = await fetchWithKey(
          `${API_BASE}/teams?league=${leagueId}&season=2024`
        );
        
        const teams = response.response || [];
        console.log(`Fetched ${teams.length} teams for league ${leagueId}`);
        
        return NextResponse.json({ success: true, count: teams.length });
      }

      case 'standings': {
        const leagueId = searchParams.get('league') || '39';
        const response = await fetchWithKey(
          `${API_BASE}/standings?league=${leagueId}&season=2024`
        );
        
        return NextResponse.json({ success: true });
      }

      case 'h2h': {
        const team1 = searchParams.get('team1');
        const team2 = searchParams.get('team2');
        const response = await fetchWithKey(
          `${API_BASE}/fixtures/headtohead?team1=${team1}&team2=${team2}&last=10`
        );
        
        console.log(`Fetched H2H: ${response.response?.length || 0} matches`);
        return NextResponse.json({ success: true, count: response.response?.length });
      }

      case 'predict': {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetchWithKey(
          `${API_BASE}/fixtures?date=${today}&status=NS`
        );
        
        const fixtures = response.response || [];
        let predictionsGenerated = 0;
        
        for (const fixture of fixtures) {
          predictionsGenerated++;
          if (predictionsGenerated >= 10) break;
        }
        
        return NextResponse.json({ 
          success: true, 
          matches: fixtures.length,
          predictions: predictionsGenerated 
        });
      }

      case 'status': {
        return NextResponse.json({ 
          status: 'ok',
          apiKey: FOOTBALL_API_KEY ? 'configured' : 'missing',
          timestamp: new Date().toISOString()
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: fixtures, teams, h2h, predict, status' 
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
