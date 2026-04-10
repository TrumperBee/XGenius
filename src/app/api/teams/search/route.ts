import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const limit = parseInt(searchParams.get('limit') || '30');

  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  if (!search || search.length < 2) {
    return NextResponse.json({ teams: [], message: 'Enter at least 2 characters to search' });
  }

  try {
    const response = await fetch(
      `${API_BASE}/teams?search=${encodeURIComponent(search)}&limit=${limit}`,
      { 
        headers: { 'x-apisports-key': API_KEY },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      console.log('Teams API error:', response.status);
      throw new Error('Teams API error');
    }

    const data = await response.json();
    const teams = (data.response || []).map((team: any) => ({
      id: team.team.id,
      name: team.team.name,
      short_name: team.team.code || team.team.name.substring(0, 3).toUpperCase(),
      logo: team.team.logo,
      country: team.team.country,
      league: team.team.league?.name || 'Unknown'
    }));

    console.log('Team search for', search, ':', teams.length, 'results');
    return NextResponse.json({ teams, total: teams.length });

  } catch (error: any) {
    console.log('Team search error:', error.message);
    return NextResponse.json({ 
      teams: [], 
      error: error.message,
      message: 'Failed to search teams. Please try again.'
    });
  }
}
