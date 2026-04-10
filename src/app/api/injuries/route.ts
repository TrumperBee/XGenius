import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('team');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${API_BASE}/injuries?team=${teamId}&date=${date}`,
      {
        headers: { 'x-apisports-key': API_KEY! },
        next: { revalidate: 3600 }
      }
    );

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();

    const injuries = (data.response || []).map((item: any) => ({
      player: {
        id: item.player.id,
        name: item.player.name,
        photo: item.player.photo
      },
      team: {
        id: item.team.id,
        name: item.team.name,
        logo: item.team.logo
      },
      injury: {
        type: item.injury.type,
        status: item.injury.status,
        detail: item.injury.detail
      },
      date: item.fixture?.date
    }));

    return NextResponse.json({
      success: true,
      team_id: teamId,
      date,
      injuries,
      verified_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Injuries API Error:', error);
    return NextResponse.json({
      success: false,
      injuries: [],
      error: 'Failed to fetch injuries'
    });
  }
}
