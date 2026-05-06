import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: false, injuries: [], source: 'unavailable' });
  }

  try {
    const response = await fetch(`${API_BASE}/players/injuries?team=${teamId}&season=2025`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, injuries: [], source: 'api' });
    }

    const data = await response.json();
    const injuries = (data.response || []).map((i: any) => ({
      playerId: i.player?.id || 0,
      playerName: i.player?.name || 'Unknown',
      playerPhoto: i.player?.photo || '',
      type: i.type || 'Injury',
      reason: i.reason || 'Not specified',
      expectedReturn: i.expected || 'Unknown',
      startDate: i.fixture?.date || null
    }));

    return NextResponse.json({ success: true, injuries, total: injuries.length, source: 'api' });

  } catch (error) {
    return NextResponse.json({ success: true, injuries: [], source: 'unavailable' });
  }
}
