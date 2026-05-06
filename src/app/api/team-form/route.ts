import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getFromFirestore(collection: string, docId: string) {
  if (!FIREBASE_API_KEY) return null;
  try {
    const url = `${FIRESTORE_BASE}/${collection}/${docId}?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.fields) return null;
    const fields = convertFirestoreFields(data.fields || {});
    if (fields.fixtures && Array.isArray(fields.fixtures) && fields.fixtures.length > 0) {
      return { id: data.name?.split('/').pop(), ...fields };
    }
    return null;
  } catch {
    return null;
  }
}

function convertFirestoreFields(fields: any): any {
  const result: any = {};
  for (const key in fields) {
    const field = fields[key];
    if (field.stringValue !== undefined) result[key] = field.stringValue;
    else if (field.integerValue !== undefined) result[key] = parseInt(field.integerValue);
    else if (field.doubleValue !== undefined) result[key] = parseFloat(field.doubleValue);
    else if (field.booleanValue !== undefined) result[key] = field.booleanValue;
    else if (field.mapValue !== undefined) result[key] = convertFirestoreFields(field.mapValue.fields || {});
    else if (field.arrayValue !== undefined) {
      result[key] = (field.arrayValue.values || []).map((v: any) => 
        v.stringValue !== undefined ? v.stringValue :
        v.integerValue !== undefined ? parseInt(v.integerValue) :
        v.mapValue !== undefined ? convertFirestoreFields(v.mapValue.fields || {}) :
        v
      );
    }
  }
  return result;
}

async function saveToFirestore(collection: string, docId: string, data: any) {
  if (!FIREBASE_API_KEY) return;
  try {
    const url = `${FIRESTORE_BASE}/${collection}/${docId}?key=${FIREBASE_API_KEY}`;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: convertToFirestoreFields(data) })
    });
  } catch (e) {
    console.error(`Save error:`, e);
  }
}

function convertToFirestoreFields(data: any): any {
  const result: any = {};
  for (const key in data) {
    const value = data[key];
    if (value === null || value === undefined) result[key] = { nullValue: null };
    else if (typeof value === 'string') result[key] = { stringValue: value };
    else if (typeof value === 'number') result[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    else if (typeof value === 'boolean') result[key] = { booleanValue: value };
    else if (Array.isArray(value)) {
      result[key] = {
        arrayValue: {
          values: value.map(v => {
            if (typeof v === 'string') return { stringValue: v };
            if (typeof v === 'number') return { integerValue: v };
            if (typeof v === 'object' && v !== null) return { mapValue: { fields: convertToFirestoreFields(v) } };
            return { stringValue: String(v) };
          })
        }
      };
    }
    else if (typeof value === 'object') {
      result[key] = { mapValue: { fields: convertToFirestoreFields(value) } };
    }
    else result[key] = { stringValue: String(value) };
  }
  return result;
}

function getSeasonDates() {
  // Free API plan only supports 2022-2024 seasons
  const from = '2024-08-01';
  const to = '2025-06-30';
  return { from, to, season: '2024' };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'teamId required' }, { status: 400 });
  }

  const cached = await getFromFirestore('team_form_cache', teamId);
  if (cached) {
    return NextResponse.json({
      success: true,
      fixtures: cached.fixtures || [],
      summary: cached.summary || null,
      form: cached.form_data || [],
      source: 'firebase'
    });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: false, fixtures: [], summary: null, form: [], source: 'error' });
  }

  try {
    const { from, to, season } = getSeasonDates();
    console.log(`Fetching form for team ${teamId} from ${from} to ${to} (season ${season})...`);
    
    const response = await fetch(`${API_BASE}/fixtures?team=${teamId}&from=${from}&to=${to}&season=${season}&status=FT`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error(`API error for team ${teamId}: ${response.status}`);
      return NextResponse.json({ success: true, fixtures: [], summary: null, form: [], source: 'api' });
    }

    const data = await response.json();
    const rawFixtures = (data.response || []).filter((f: any) => f.score?.fulltime?.home !== null);
    
    console.log(`Raw fixtures for team ${teamId}: ${rawFixtures.length}`);

    const sorted = rawFixtures.sort((a: any, b: any) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime());
    const recent = sorted.slice(0, 10);
    
    const fixtures: Array<{ id: number; date: string; league: string; opponent: string; opponentShort: string; isHome: boolean; home_score: number; away_score: number; goalsFor: number; goalsAgainst: number; result: string }> = recent.map((f: any) => {
      const isHome = f.teams.home.id === Number(teamId);
      const goalsFor = isHome ? f.score.fulltime.home : f.score.fulltime.away;
      const goalsAgainst = isHome ? f.score.fulltime.away : f.score.fulltime.home;
      return {
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        opponent: isHome ? f.teams.away.name : f.teams.home.name,
        opponentShort: (isHome ? f.teams.away.name : f.teams.home.name).substring(0, 3).toUpperCase(),
        isHome,
        home_score: f.score.fulltime.home ?? 0,
        away_score: f.score.fulltime.away ?? 0,
        goalsFor,
        goalsAgainst,
        result: goalsFor > goalsAgainst ? 'W' : goalsFor === goalsAgainst ? 'D' : 'L'
      };
    });

    console.log(`Processed fixtures: ${fixtures.length}`);

    const summary = {
      total: fixtures.length,
      wins: fixtures.filter((f: { result: string }) => f.result === 'W').length,
      draws: fixtures.filter((f: { result: string }) => f.result === 'D').length,
      losses: fixtures.filter((f: { result: string }) => f.result === 'L').length,
      goalsFor: fixtures.reduce((s: number, f: { goalsFor: number }) => s + f.goalsFor, 0),
      goalsAgainst: fixtures.reduce((s: number, f: { goalsAgainst: number }) => s + f.goalsAgainst, 0),
      cleanSheets: fixtures.filter((f: { goalsAgainst: number }) => f.goalsAgainst === 0).length
    };

    if (fixtures.length > 0) {
      await saveToFirestore('team_form_cache', teamId, {
        team_id: Number(teamId),
        form_data: fixtures.slice(0, 5).map(f => f.result),
        summary,
        fixtures
      });
    }

    return NextResponse.json({
      success: true,
      fixtures,
      summary,
      form: fixtures.slice(0, 5).map(f => f.result),
      source: 'api'
    });

  } catch (error) {
    console.error(`Form fetch error for team ${teamId}:`, error);
    return NextResponse.json({ success: false, fixtures: [], summary: null, form: [], source: 'error' });
  }
}
