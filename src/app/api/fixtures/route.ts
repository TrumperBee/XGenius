import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const FRIENDLY_LEAGUE_IDS = [666, 667];

const TOP_TIER_TEAM_IDS = new Set([
  33, 34, 35, 36, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 55, 56, 57, 58, 65, 66, 80, 81, 85, 157, 160, 161, 162, 163, 164, 165, 167, 168, 169, 170, 171, 172, 173, 176, 178, 179, 180, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 211, 212, 214, 228, 237, 244, 281, 294, 398, 496, 497, 498, 499, 500, 505, 516, 529, 541, 543, 546, 547, 548, 610, 715, 720, 724, 727, 728, 730, 731, 732, 738, 744, 745, 746, 747, 748, 749, 750, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800
]);

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
      body: JSON.stringify({
        fields: convertToFirestoreFields(data)
      })
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

function isAllowedFriendly(fixture: any): boolean {
  const leagueId = fixture.league?.id;
  if (!FRIENDLY_LEAGUE_IDS.includes(leagueId)) return true;
  if (leagueId === 667) return true;
  if (leagueId === 666) {
    const homeId = fixture.teams?.home?.id;
    const awayId = fixture.teams?.away?.id;
    return TOP_TIER_TEAM_IDS.has(homeId) || TOP_TIER_TEAM_IDS.has(awayId);
  }
  return false;
}

function isFIFAInternationalWindow(dateStr: string): boolean {
  const date = new Date(dateStr);
  return [2, 5, 8, 10].includes(date.getMonth());
}

async function fetchFromAPI(dateStr: string): Promise<any[]> {
  if (!API_KEY) return [];
  
  const response = await fetch(`${API_BASE}/fixtures?date=${dateStr}&timezone=UTC`, {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(15000)
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.response || [];
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
    console.log('Cache miss - fetching from API and caching...');
    allMatches.length = 0;
    
    for (let i = 0; i < days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];

      const apiMatches = await fetchFromAPI(dateStr);
      
      const matches = apiMatches
        .filter((f: any) => ALLOWED_LEAGUE_IDS.includes(f.league.id))
        .filter((f: any) => isAllowedFriendly(f))
        .filter((f: any) => f.league.id !== 667 || isFIFAInternationalWindow(dateStr))
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
        await saveToFirestore(String(match.id), match);
        allMatches.push(match);
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
