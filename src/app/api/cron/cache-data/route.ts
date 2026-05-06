import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

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
          values: value.map((v: any) => {
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
  console.log('=== CRON: Fetching and caching data ===');
  
  if (!API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  try {
    const today = new Date();
    const results = { fixtures: 0, teams: new Set<number>(), h2h: 0 };

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      console.log(`Fetching fixtures for ${dateStr}...`);
      
      const response = await fetch(
        `${API_BASE}/fixtures?date=${dateStr}&timezone=UTC`,
        { headers: { 'x-apisports-key': API_KEY } }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const fixtures = (data.response || [])
        .filter((f: any) => ALLOWED_LEAGUE_IDS.includes(f.league.id))
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
          status_long: f.status.long
        }));

      if (fixtures.length > 0) {
        for (const fixture of fixtures) {
          await saveToFirestore('fixtures_cache', String(fixture.id), fixture);
        }
        results.fixtures += fixtures.length;

        fixtures.forEach((f: any) => {
          results.teams.add(f.home_team.id);
          results.teams.add(f.away_team.id);
        });
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Cached ${results.fixtures} fixtures for ${results.teams.size} teams`);

    const teamList = Array.from(results.teams);
    for (const teamId of teamList.slice(0, 50)) {
      console.log(`Fetching form for team ${teamId}...`);
      
      const formResponse = await fetch(
        `${API_BASE}/fixtures?team=${teamId}&last=10&status=FT`,
        { headers: { 'x-apisports-key': API_KEY } }
      );

      if (formResponse.ok) {
        const formData = await formResponse.json();
        const rawFixtures = formData.response || [];
        
        const mappedFixtures = rawFixtures
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

        if (mappedFixtures.length > 0) {
          const wins = mappedFixtures.filter((f: any) => f.result === 'W').length;
          const draws = mappedFixtures.filter((f: any) => f.result === 'D').length;
          const losses = mappedFixtures.filter((f: any) => f.result === 'L').length;

          await saveToFirestore('team_form_cache', String(teamId), {
            team_id: teamId,
            form_data: mappedFixtures.slice(0, 5).map((f: any) => f.result),
            summary: {
              total: mappedFixtures.length,
              wins,
              draws,
              losses,
              goalsFor: mappedFixtures.reduce((sum: number, f: any) => sum + f.goalsFor, 0),
              goalsAgainst: mappedFixtures.reduce((sum: number, f: any) => sum + f.goalsAgainst, 0),
              cleanSheets: mappedFixtures.filter((f: any) => f.goalsAgainst === 0).length
            },
            fixtures: mappedFixtures
          });
        }
      }

      await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Cached form for ${Math.min(teamList.length, 50)} teams`);

    console.log('Fetching H2H data for upcoming fixtures...');
    const h2hPairs = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const response = await fetch(
        `${API_BASE}/fixtures?date=${dateStr}&timezone=UTC`,
        { headers: { 'x-apisports-key': API_KEY } }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const fixtures = (data.response || []).filter((f: any) => ALLOWED_LEAGUE_IDS.includes(f.league.id));

      for (const f of fixtures.slice(0, 20)) {
        const homeId = f.teams.home.id;
        const awayId = f.teams.away.id;
        const minId = Math.min(homeId, awayId);
        const maxId = Math.max(homeId, awayId);
        const pairKey = `${minId}_${maxId}`;
        
        if (!h2hPairs.has(pairKey)) {
          h2hPairs.add(pairKey);
          
          try {
            const h2hResponse = await fetch(
              `${API_BASE}/fixtures?h2h=${homeId}-${awayId}&last=10`,
              { headers: { 'x-apisports-key': API_KEY } }
            );

            if (h2hResponse.ok) {
              const h2hData = await h2hResponse.json();
              const rawH2H = h2hData.response || [];
              
              const h2hFixtures = rawH2H
                .filter((hf: any) => hf.score?.fulltime?.home !== null)
                .map((hf: any) => ({
                  id: hf.fixture.id,
                  date: hf.fixture.date,
                  league: hf.league.name,
                  competition: hf.league.name,
                  home_team: { id: hf.teams.home.id, name: hf.teams.home.name, logo: hf.teams.home.logo },
                  away_team: { id: hf.teams.away.id, name: hf.teams.away.name, logo: hf.teams.away.logo },
                  home_score: hf.score.fulltime.home ?? 0,
                  away_score: hf.score.fulltime.away ?? 0,
                  winner: hf.score.fulltime.home > hf.score.fulltime.away ? 'home' : 
                          hf.score.fulltime.away > hf.score.fulltime.home ? 'away' : 'draw'
                }));

              if (h2hFixtures.length > 0) {
                const homeWins = h2hFixtures.filter((hf: any) => hf.winner === 'home').length;
                const awayWins = h2hFixtures.filter((hf: any) => hf.winner === 'away').length;
                const draws = h2hFixtures.filter((hf: any) => hf.winner === 'draw').length;

                await saveToFirestore('h2h_cache', pairKey, {
                  team1_id: minId,
                  team2_id: maxId,
                  fixtures: h2hFixtures,
                  summary: {
                    total: h2hFixtures.length,
                    home_wins: homeWins,
                    away_wins: awayWins,
                    draws,
                    goals: {
                      home: h2hFixtures.reduce((sum: number, hf: any) => sum + (hf.home_score || 0), 0),
                      away: h2hFixtures.reduce((sum: number, hf: any) => sum + (hf.away_score || 0), 0)
                    }
                  }
                });
                results.h2h++;
              }
            }
            
            await new Promise(r => setTimeout(r, 300));
          } catch (e) {
            console.error(`H2H error for ${pairKey}:`, e);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        fixtures: results.fixtures,
        teams: results.teams.size,
        h2h: results.h2h,
        cached_at: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
