import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const TOP_LEAGUE_IDS = [39, 140, 78, 135, 61, 2, 3, 848, 88, 94];

async function getFromFirestore(collection: string, whereField?: string, whereValue?: string) {
  if (!FIREBASE_API_KEY) return null;

  try {
    let url = `${FIRESTORE_BASE}/${collection}?key=${FIREBASE_API_KEY}`;
    if (whereField && whereValue) {
      url = `${FIRESTORE_BASE}/${collection}:runQuery?key=${FIREBASE_API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collection }],
            where: {
              fieldFilter: {
                field: { fieldPath: whereField },
                op: 'EQUAL',
                value: { integerValue: whereValue }
              }
            }
          }
        })
      });
      
      if (!response.ok) return null;
      const data = await response.json();
      
      if (!data || !Array.isArray(data)) return [];
      return data
        .filter((item: any) => item.document)
        .map((item: any) => ({
          id: item.document.name?.split('/').pop(),
          ...convertFirestoreFields(item.document.fields || {})
        }));
    }
    
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    
    if (!data.documents) return [];
    return data.documents.map((doc: any) => ({
      id: doc.name?.split('/').pop(),
      ...convertFirestoreFields(doc.fields || {})
    }));
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
    else if (typeof value === 'number') {
      result[key] = Number.isInteger(value) ? { integerValue: value } : { doubleValue: value };
    }
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
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');

  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const cached = await getFromFirestore('fixtures_cache', 'date', String(currentDate.getTime()));
    if (cached && cached.length > 0) {
      return NextResponse.json({
        success: true,
        date,
        matches: cached,
        total: cached.length,
        source: 'firebase'
      });
    }
  }

  try {
    const allMatches: any[] = [];
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const data = await fetchFromAPI(`/fixtures?date=${dateStr}&timezone=UTC`);
      const apiMatches = data.response || [];

      const matches = apiMatches
        .filter((f: any) => TOP_LEAGUE_IDS.includes(f.league.id))
        .map((f: any) => ({
          id: f.fixture.id,
          date: f.fixture.date,
          league: f.league.name,
          league_id: f.league.id,
          country: f.league.country,
          home_team: {
            id: f.teams.home.id,
            name: f.teams.home.name,
            short: f.teams.home.name?.substring(0, 3).toUpperCase(),
            logo: f.teams.home.logo
          },
          away_team: {
            id: f.teams.away.id,
            name: f.teams.away.name,
            short: f.teams.away.name?.substring(0, 3).toUpperCase(),
            logo: f.teams.away.logo
          },
          home_score: f.score?.fulltime?.home,
          away_score: f.score?.fulltime?.away,
          status: f.status?.short === 'FT' ? 'finished' : f.status?.short === 'LIVE' ? 'live' : 'scheduled',
          status_long: f.status?.long
        }));

      for (const match of matches) {
        await saveToFirestore('fixtures_cache', String(match.id), match);
        allMatches.push(match);
      }
      
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({
      success: true,
      date,
      matches: allMatches,
      total: allMatches.length,
      source: 'api'
    });

  } catch (error: any) {
    console.error('Fixtures error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      matches: [],
      source: 'error'
    });
  }
}
