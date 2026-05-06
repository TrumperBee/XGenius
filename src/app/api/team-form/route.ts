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
    
    return {
      id: data.name?.split('/').pop(),
      ...convertFirestoreFields(data.fields || {})
    };
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
      body: JSON.stringify({
        fields: convertToFirestoreFields(data)
      })
    });
  } catch (e) {
    console.error(`Save error for ${collection}:`, e);
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

async function fetchFromAPI(path: string): Promise<any> {
  if (!API_KEY) throw new Error('API key not configured');
  
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(10000)
  });
  
  if (!response.ok) throw new Error('API error');
  return response.json();
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

  try {
    const data = await fetchFromAPI(`/fixtures?team=${teamId}&last=10&status=FT`);
    const rawFixtures = data.response || [];
    
    const fixtures = rawFixtures
      .filter((f: any) => f.score?.fulltime?.home !== null)
      .slice(0, 10)
      .map((f: any) => {
        const isHome = f.teams.home.id === Number(teamId);
        const goalsFor = isHome ? f.score.fulltime.home : f.score.fulltime.away;
        const goalsAgainst = isHome ? f.score.fulltime.away : f.score.fulltime.home;
        const won = goalsFor > goalsAgainst;
        const draw = goalsFor === goalsAgainst;
        
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
          result: won ? 'W' : draw ? 'D' : 'L'
        };
      });

    const wins = fixtures.filter((f: any) => f.result === 'W').length;
    const draws = fixtures.filter((f: any) => f.result === 'D').length;
    const losses = fixtures.filter((f: any) => f.result === 'L').length;
    
    const summary = {
      total: fixtures.length,
      wins,
      draws,
      losses,
      goalsFor: fixtures.reduce((sum: number, f: any) => sum + f.goalsFor, 0),
      goalsAgainst: fixtures.reduce((sum: number, f: any) => sum + f.goalsAgainst, 0),
      cleanSheets: fixtures.filter((f: any) => f.goalsAgainst === 0).length
    };

    await saveToFirestore('team_form_cache', teamId, {
      team_id: Number(teamId),
      form_data: fixtures.slice(0, 5).map((f: any) => f.result),
      summary,
      fixtures
    });

    return NextResponse.json({
      success: true,
      fixtures,
      summary,
      form: fixtures.slice(0, 5).map((f: any) => f.result),
      source: 'api'
    });

  } catch (error) {
    console.error('Team form error:', error);
    return NextResponse.json({
      success: false,
      fixtures: [],
      summary: null,
      form: [],
      source: 'error'
    });
  }
}
