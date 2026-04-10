import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

console.log('API Key present:', !!API_KEY);
console.log('API Key prefix:', API_KEY?.substring(0, 10));

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Test endpoint - fetch a few dates
  const today = new Date();
  const testDates = [
    today.toISOString().split('T')[0],
    new Date(today.getTime() + 86400000).toISOString().split('T')[0]
  ];

  const allResults = [];

  for (const date of testDates) {
    try {
      const response = await fetch(
        `${API_BASE}/fixtures?date=${date}&timezone=UTC`,
        { 
          headers: { 'x-apisports-key': API_KEY! },
          cache: 'no-store'
        }
      );
      
      console.log(`Date ${date}:`, response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Date ${date} - matches:`, data.response?.length || 0);
        
        allResults.push({
          date,
          count: data.response?.length || 0,
          matches: data.response?.slice(0, 3).map((f: any) => ({
            id: f.fixture.id,
            league: f.league.name,
            home: f.teams.home.name,
            away: f.teams.away.name,
            time: f.fixture.date
          })) || []
        });
      }
    } catch (e: any) {
      console.error(`Date ${date} error:`, e.message);
    }
  }

  return NextResponse.json({
    api_key_working: !!API_KEY,
    test_dates: testDates,
    results: allResults,
    timestamp: new Date().toISOString()
  });
}