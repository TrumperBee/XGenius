import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const team1 = searchParams.get('team1');
  const team2 = searchParams.get('team2');
  const last = parseInt(searchParams.get('last') || '10');

  if (!team1 || !team2) {
    return NextResponse.json({ error: 'team1 and team2 required' }, { status: 400 });
  }

  if (!API_KEY) {
    return mockH2HFallback(team1, team2);
  }

  try {
    const h2hResponse = await fetch(
      `${API_BASE}/fixtures/headtohead?h2h=${team1}-${team2}&last=${last}`,
      { headers: { 'x-apisports-key': API_KEY } }
    );

    if (!h2hResponse.ok) throw new Error('H2H API error');

    const h2hData = await h2hResponse.json();
    const fixtures = (h2hData.response || []).map((f: any) => ({
      id: f.fixture.id,
      date: f.fixture.date,
      league: f.league.name,
      competition: f.league.name,
      home_team: { id: f.teams.home.id, name: f.teams.home.name, short: f.teams.home.name.substring(0,3) },
      away_team: { id: f.teams.away.id, name: f.teams.away.name, short: f.teams.away.name.substring(0,3) },
      home_score: f.score.fulltime.home,
      away_score: f.score.fulltime.away,
      winner: f.score.fulltime.home > f.score.fulltime.away ? 'home' : 
               f.score.fulltime.away > f.score.fulltime.home ? 'away' : 'draw'
    }));

    if (fixtures.length > 0) {
      const homeWins = fixtures.filter((f: any) => f.winner === 'home').length;
      const awayWins = fixtures.filter((f: any) => f.winner === 'away').length;
      const draws = fixtures.filter((f: any) => f.winner === 'draw').length;
      const totalGoalsHome = fixtures.reduce((sum: number, f: any) => sum + (f.home_score || 0), 0);
      const totalGoalsAway = fixtures.reduce((sum: number, f: any) => sum + (f.away_score || 0), 0);

      return NextResponse.json({
        success: true,
        has_history: true,
        fixtures,
        summary: {
          total: fixtures.length,
          home_wins: homeWins,
          away_wins: awayWins,
          draws,
          goals: { home: totalGoalsHome, away: totalGoalsAway }
        },
        verification: { verified: true, data_quality: 'high' }
      });
    }

    const commonOpponents = await findCommonOpponents(Number(team1), Number(team2), API_KEY);

    return NextResponse.json({
      success: true,
      has_history: false,
      fixtures: [],
      summary: null,
      common_opponents: commonOpponents,
      friendly_message: {
        title: "📜 No direct H2H data available",
        explanation: "No recent meetings found between these teams.",
        possible_reasons: [
          "Teams may be from different leagues",
          "Teams haven't met in recent seasons",
          "First meeting in competitive football"
        ],
        alternative: commonOpponents.length > 0 ? 
          `Compare form against ${commonOpponents.length} common opponents` : 
          "Compare overall form and league position",
        suggestions: [
          "Check league standings for context",
          "Compare recent form (last 5 matches)",
          "Analyze home/away performance separately"
        ]
      },
      verification: { verified: false, data_quality: 'low' }
    });

  } catch (error: any) {
    return mockH2HFallback(team1, team2);
  }
}

async function findCommonOpponents(team1Id: number, team2Id: number, apiKey: string) {
  try {
    const t1Response = await fetch(
      `${API_BASE}/fixtures?team=${team1Id}&last=10`,
      { headers: { 'x-apisports-key': apiKey } }
    );
    const t2Response = await fetch(
      `${API_BASE}/fixtures?team=${team2Id}&last=10`,
      { headers: { 'x-apisports-key': apiKey } }
    );

    const t1Data = await t1Response.json();
    const t2Data = await t2Response.json();

    const t1Opponents = new Set((t1Data.response || []).map((f: any) => 
      f.teams.home.id === team1Id ? f.teams.away.id : f.teams.home.id
    ));
    const t2Opponents = new Set((t2Data.response || []).map((f: any) => 
      f.teams.home.id === team2Id ? f.teams.away.id : f.teams.home.id
    ));

    const common = [...t1Opponents].filter(id => t2Opponents.has(id));
    return common.slice(0, 5);
  } catch {
    return [];
  }
}

function mockH2HFallback(team1: string, team2: string) {
  return NextResponse.json({
    success: false,
    has_history: false,
    fixtures: [],
    summary: null,
    friendly_message: {
      title: "📜 Head-to-Head History Unavailable",
      explanation: "We couldn't retrieve historical data for these teams.",
      possible_reasons: [
        "Teams haven't met in the last 5 years",
        "Teams from different leagues",
        "API rate limit reached"
      ],
      alternative: "Compare recent form",
      suggestions: [
        "Compare form (last 5 matches)",
        "Analyze home vs away performance",
        "Check league standings"
      ]
    },
    verification: { verified: false, data_quality: 'blocked' },
    fallback: true
  });
}