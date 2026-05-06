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
    // Only return if there's actual H2H data
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'team1 and team2 required' }, { status: 400 });
  }

  const minId = Math.min(Number(team1), Number(team2));
  const maxId = Math.max(Number(team1), Number(team2));
  const cacheDocId = `${minId}_${maxId}`;

  const cached = await getFromFirestore('h2h_cache', cacheDocId);
  if (cached) {
    return NextResponse.json({
      success: true,
      has_history: true,
      fixtures: cached.fixtures || [],
      summary: cached.summary || null,
      source: 'firebase'
    });
  }

  if (!API_KEY) {
    return NextResponse.json({ success: true, has_history: false, fixtures: [], summary: null, source: 'api' });
  }

  try {
    const response = await fetch(`${API_BASE}/fixtures?h2h=${team1}-${team2}&last=10`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      return NextResponse.json({ success: true, has_history: false, fixtures: [], summary: null, source: 'api' });
    }

    const data = await response.json();
    const rawFixtures = data.response || [];
    
    const fixtures: Array<{ id: number; date: string; league: string; competition: string; home_team: { id: number; name: string; logo: string }; away_team: { id: number; name: string; logo: string }; home_score: number; away_score: number; winner: string }> = rawFixtures
      .filter((f: any) => f.score?.fulltime?.home !== null)
      .map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        competition: f.league.name,
        home_team: { id: f.teams.home.id, name: f.teams.home.name, logo: f.teams.home.logo },
        away_team: { id: f.teams.away.id, name: f.teams.away.name, logo: f.teams.away.logo },
        home_score: f.score.fulltime.home ?? 0,
        away_score: f.score.fulltime.away ?? 0,
        winner: f.score.fulltime.home > f.score.fulltime.away ? 'home' : f.score.fulltime.away > f.score.fulltime.home ? 'away' : 'draw'
      }));

    const summary = {
      total: fixtures.length,
      home_wins: fixtures.filter((f: { winner: string }) => f.winner === 'home').length,
      away_wins: fixtures.filter((f: { winner: string }) => f.winner === 'away').length,
      draws: fixtures.filter((f: { winner: string }) => f.winner === 'draw').length,
      goals: {
        home: fixtures.reduce((s: number, f: { home_score: number }) => s + (f.home_score || 0), 0),
        away: fixtures.reduce((s: number, f: { away_score: number }) => s + (f.away_score || 0), 0)
      }
    };

    await saveToFirestore('h2h_cache', cacheDocId, {
      team1_id: minId,
      team2_id: maxId,
      fixtures,
      summary
    });

    return NextResponse.json({
      success: true,
      has_history: fixtures.length > 0,
      fixtures,
      summary,
      source: 'api'
    });

  } catch (error) {
    return NextResponse.json({ success: false, has_history: false, fixtures: [], summary: null, source: 'error' });
  }
}
