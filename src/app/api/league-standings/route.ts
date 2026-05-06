import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getCachedStandings(leagueId: string, season: string) {
  if (!FIREBASE_API_KEY) return null;
  try {
    const url = `${FIRESTORE_BASE}/standings_cache/${leagueId}_${season}?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return convertFields(data.fields || {});
  } catch {
    return null;
  }
}

async function saveCachedStandings(leagueId: string, season: string, data: any) {
  if (!FIREBASE_API_KEY) return;
  try {
    const url = `${FIRESTORE_BASE}/standings_cache/${leagueId}_${season}?key=${FIREBASE_API_KEY}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: convertToFields(data) })
    });
  } catch {}
}

function convertFields(fields: any): any {
  const result: any = {};
  for (const key in fields) {
    const field = fields[key];
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue);
    else if (field.doubleValue !== undefined) result[key] = parseFloat(field.doubleValue);
    else if (field.mapValue) result[key] = convertFields(field.mapValue.fields || {});
  }
  return result;
}

function convertToFields(data: any): any {
  const result: any = {};
  for (const key in data) {
    const value = data[key];
    if (value === null || value === undefined) result[key] = { nullValue: null };
    else if (typeof value === 'string') result[key] = { stringValue: value };
    else if (typeof value === 'number') result[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    else if (typeof value === 'boolean') result[key] = { booleanValue: value };
    else if (typeof value === 'object') {
      if (Array.isArray(value)) {
        result[key] = { arrayValue: { values: value.map((v: any) => typeof v === 'object' ? { mapValue: { fields: convertToFields(v) } } : { stringValue: String(v) }) } };
      } else {
        result[key] = { mapValue: { fields: convertToFields(value) } };
      }
    }
    else result[key] = { stringValue: String(value) };
  }
  return result;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const season = searchParams.get('season') || '2024';

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId required' }, { status: 400 });
  }

  const cached = await getCachedStandings(leagueId, season);
  if (cached && cached.standings) {
    return NextResponse.json({ success: true, standings: cached.standings, source: 'cache' });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_BASE}/standings?league=${leagueId}&season=${season}`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch standings' }, { status: 500 });
    }

    const data = await response.json();
    const standings = data.response?.[0]?.league?.standings?.[0] || [];

    const result = standings.map((s: any) => ({
      rank: s.rank,
      teamId: s.team?.id || 0,
      teamName: s.team?.name || '',
      teamLogo: s.team?.logo || '',
      points: s.points || 0,
      played: s.all?.played || 0,
      wins: s.all?.win || 0,
      draws: s.all?.draw || 0,
      losses: s.all?.lose || 0,
      goalsFor: s.all?.goals?.for || 0,
      goalsAgainst: s.all?.goals?.against || 0,
      goalDifference: s.goalsDiff || 0,
      form: s.form || '',
      homeRecord: {
        played: s.home?.played || 0,
        wins: s.home?.win || 0,
        draws: s.home?.draw || 0,
        losses: s.home?.lose || 0,
        goalsFor: s.home?.goals?.for || 0,
        goalsAgainst: s.home?.goals?.against || 0
      },
      awayRecord: {
        played: s.away?.played || 0,
        wins: s.away?.win || 0,
        draws: s.away?.draw || 0,
        losses: s.away?.lose || 0,
        goalsFor: s.away?.goals?.for || 0,
        goalsAgainst: s.away?.goals?.against || 0
      }
    }));

    await saveCachedStandings(leagueId, season, { standings: result });

    return NextResponse.json({ success: true, standings: result, source: 'api' });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}
