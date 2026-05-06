import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS, TIER_1_LEAGUES, TIER_2_LEAGUES } from '@/config/leagues';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const TOP_TIER_TEAM_IDS = new Set([
  33, 34, 35, 36, 39, 40, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 33, 55, 56, 57, 58, 65, 66, 80, 81, 85, 157, 160, 161, 162, 163, 164, 165, 167, 168, 169, 170, 171, 172, 173, 176, 178, 179, 180, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 211, 212, 214, 228, 237, 244, 281, 294, 398, 496, 497, 498, 499, 500, 505, 516, 529, 541, 543, 546, 547, 548, 610, 715, 720, 724, 727, 728, 730, 731, 732, 738, 744, 745, 746, 747, 748, 749, 750, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 762, 763, 764, 765, 766, 767, 768, 769, 770, 771, 772, 773, 774, 775, 776, 777, 778, 779, 780, 781, 782, 783, 784, 785, 786, 787, 788, 789, 790, 791, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807, 808, 809, 810, 811, 812, 813, 814, 815, 816, 817, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839, 840, 841, 842, 843, 844, 845, 846, 847, 848, 849, 850
]);

const FIFA_TOP_50_NATIONS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50
]);

const FRIENDLY_LEAGUE_IDS = [666, 667];

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

function isAllowedFriendly(fixture: any): boolean {
  const leagueId = fixture.league?.id;
  const isFriendly = FRIENDLY_LEAGUE_IDS.includes(leagueId);
  
  if (!isFriendly) return true;
  
  const isInternational = leagueId === 667;
  const isClub = leagueId === 666;
  
  if (isInternational) {
    return true;
  }
  
  if (isClub) {
    const homeId = fixture.teams?.home?.id;
    const awayId = fixture.teams?.away?.id;
    return TOP_TIER_TEAM_IDS.has(homeId) || TOP_TIER_TEAM_IDS.has(awayId);
  }
  
  return false;
}

function isFIFAInternationalWindow(dateStr: string): boolean {
  const date = new Date(dateStr);
  const month = date.getMonth();
  return [2, 5, 8, 10].includes(month);
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
        .filter((f: any) => ALLOWED_LEAGUE_IDS.includes(f.league.id))
        .filter((f: any) => isAllowedFriendly(f))
        .filter((f: any) => {
          if (f.league.id === 667) {
            return isFIFAInternationalWindow(dateStr);
          }
          return true;
        })
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
