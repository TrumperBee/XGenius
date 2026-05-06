import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const LEAGUE_IDS_NO_FRIENDLY = ALLOWED_LEAGUE_IDS.filter(id => id !== 666 && id !== 667);

async function queryFirestoreByDate(dateStr: string) {
  if (!FIREBASE_API_KEY) return [];
  try {
    const url = `${FIRESTORE_BASE}/fixtures_cache:runQuery?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'fixtures_cache' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'date' },
              op: 'STARTS_WITH',
              value: { stringValue: dateStr }
            }
          },
          orderBy: [
            { field: { fieldPath: 'league_id' }, direction: 'ASCENDING' },
            { field: { fieldPath: 'date' }, direction: 'ASCENDING' }
          ]
        }
      })
    });
    if (!response.ok) return [];
    const data = await response.json();
    if (!data || !Array.isArray(data)) return [];
    return data
      .filter((item: any) => item.document)
      .map((item: any) => ({
        id: item.document.name?.split('/').pop(),
        ...convertFirestoreFields(item.document.fields || {})
      }));
  } catch {
    return [];
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

async function saveToFirestore(docId: string, data: any) {
  if (!FIREBASE_API_KEY) return;
  try {
    const url = `${FIRESTORE_BASE}/fixtures_cache/${docId}?key=${FIREBASE_API_KEY}`;
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

function mapFixture(f: any): any {
  return {
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
  };
}

async function fetchLeagueFixtures(dateStr: string, leagueId: number): Promise<any[]> {
  if (!API_KEY) return [];
  try {
    const response = await fetch(`${API_BASE}/fixtures?date=${dateStr}&league=${leagueId}&timezone=UTC`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.response || [];
  } catch {
    return [];
  }
}

async function fetchFriendlies(dateStr: string): Promise<any[]> {
  if (!API_KEY) return [];
  const results: any[] = [];
  
  const months = new Date(dateStr).getMonth();
  if (![2, 5, 8, 10].includes(months)) return results;
  
  for (const leagueId of [666, 667]) {
    try {
      const response = await fetch(`${API_BASE}/fixtures?date=${dateStr}&league=${leagueId}&timezone=UTC`, {
        headers: { 'x-apisports-key': API_KEY },
        signal: AbortSignal.timeout(8000)
      });
      if (response.ok) {
        const data = await response.json();
        results.push(...(data.response || []));
      }
    } catch {
      continue;
    }
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');

  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  const allMatches: any[] = [];
  let needsCache = false;
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const cached = await queryFirestoreByDate(dateStr);
    if (cached.length > 0) {
      allMatches.push(...cached);
    } else {
      needsCache = true;
    }
  }

  if (needsCache && API_KEY) {
    console.log('Cache miss - fetching from API league-by-league and caching...');
    allMatches.length = 0;
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      console.log(`Fetching ${LEAGUE_IDS_NO_FRIENDLY.length} leagues for ${dateStr}...`);

      const leaguePromises = LEAGUE_IDS_NO_FRIENDLY.map(leagueId => 
        fetchLeagueFixtures(dateStr, leagueId)
      );
      
      const leagueResults = await Promise.all(leaguePromises);
      
      const friendlies = await fetchFriendlies(dateStr);
      leagueResults.push(friendlies);

      for (const fixtures of leagueResults) {
        for (const f of fixtures) {
          if (!ALLOWED_LEAGUE_IDS.includes(f.league.id)) continue;
          const match = mapFixture(f);
          await saveToFirestore(String(match.id), match);
          allMatches.push(match);
        }
      }
      
      if (i < days - 1) await new Promise(r => setTimeout(r, 200));
    }
  }

  return NextResponse.json({
    success: true,
    date,
    matches: allMatches,
    total: allMatches.length,
    source: allMatches.length > 0 && !needsCache ? 'firebase' : 'api',
    last_updated: new Date().toISOString()
  });
}
