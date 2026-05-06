import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getFromCache(teamId: string, season: string) {
  if (!FIREBASE_API_KEY) return null;
  try {
    const url = `${FIRESTORE_BASE}/team_stats_cache/${teamId}_${season}?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    return convertFields(data.fields || {});
  } catch {
    return null;
  }
}

async function saveToCache(teamId: string, season: string, data: any) {
  if (!FIREBASE_API_KEY) return;
  try {
    const url = `${FIRESTORE_BASE}/team_stats_cache/${teamId}_${season}?key=${FIREBASE_API_KEY}`;
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
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
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
        result[key] = { arrayValue: { values: value.map((v: any) => typeof v === 'string' ? { stringValue: v } : { stringValue: String(v) }) } };
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
  const teamId = searchParams.get('teamId');
  const season = searchParams.get('season') || '2025';

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  const cached = await getFromCache(teamId, season);
  if (cached) {
    return NextResponse.json({ success: true, ...cached, source: 'cache' });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`${API_BASE}/teams/statistics?team=${teamId}&league=&season=${season}`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
    }

    const data = await response.json();
    const stats = data.response;

    if (!stats || !stats.fixtures) {
      return NextResponse.json({ success: false, error: 'No stats available' }, { status: 404 });
    }

    const result = {
      teamId: parseInt(teamId),
      teamName: stats.team?.name || '',
      leagueId: stats.league?.id || 0,
      leagueName: stats.league?.name || '',
      season,
      gamesPlayed: stats.fixtures?.played?.total || 0,
      wins: stats.fixtures?.wins?.total || 0,
      draws: stats.fixtures?.draws?.total || 0,
      losses: stats.fixtures?.losses?.total || 0,
      goalsFor: stats.goals?.for?.total?.total || 0,
      goalsAgainst: stats.goals?.against?.total?.total || 0,
      goalDifference: (stats.goals?.for?.total?.total || 0) - (stats.goals?.against?.total?.total || 0),
      cleanSheets: stats.clean_sheet?.total || 0,
      homeRecord: {
        played: stats.fixtures?.played?.home || 0,
        wins: stats.fixtures?.wins?.home || 0,
        draws: stats.fixtures?.draws?.home || 0,
        losses: stats.fixtures?.losses?.home || 0,
        goalsFor: stats.goals?.for?.total?.home || 0,
        goalsAgainst: stats.goals?.against?.total?.home || 0
      },
      awayRecord: {
        played: stats.fixtures?.played?.away || 0,
        wins: stats.fixtures?.wins?.away || 0,
        draws: stats.fixtures?.draws?.away || 0,
        losses: stats.fixtures?.losses?.away || 0,
        goalsFor: stats.goals?.for?.total?.away || 0,
        goalsAgainst: stats.goals?.against?.total?.away || 0
      },
      form: stats.form ? stats.form.split('').map((c: string) => c.toUpperCase()) : [],
      position: stats.league?.position || null
    };

    await saveToCache(teamId, season, result);

    return NextResponse.json({ success: true, ...result, source: 'api' });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Request failed' }, { status: 500 });
  }
}
