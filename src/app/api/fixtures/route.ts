import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS, DEFAULT_VISIBLE_LEAGUES } from '@/config/leagues';

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const days = parseInt(searchParams.get('days') || '1');

  const baseDate = dateParam ? new Date(dateParam + 'T00:00:00Z') : new Date();
  const date = baseDate.toISOString().split('T')[0];

  const allMatches: any[] = [];
  
  for (let i = 0; i < days; i++) {
    const currentDate = new Date(baseDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    const cached = await queryFirestoreByDate(dateStr);
    if (cached.length > 0) {
      allMatches.push(...cached);
    }
  }

  return NextResponse.json({
    success: true,
    date,
    matches: allMatches,
    total: allMatches.length,
    source: 'firebase',
    last_updated: new Date().toISOString()
  });
}
