import { NextResponse } from 'next/server';

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

  return NextResponse.json({
    success: true,
    has_history: false,
    fixtures: [],
    summary: null,
    source: 'firebase',
    message: 'Data not yet cached. Wait for cron job to run.'
  });
}
