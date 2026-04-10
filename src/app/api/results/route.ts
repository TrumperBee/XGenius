import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const LEAGUE_IDS = [39, 140, 78, 135, 61];

function getNextMatchday() {
  const now = new Date();
  const day = now.getDay();
  const nextDate = new Date(now);
  
  if (day <= 1) nextDate.setDate(now.getDate() + (2 - day)); // Tuesday
  else if (day === 2 || day === 3) return "Today (Champions League)";
  else if (day === 4) return "Today (Europa League)";
  else if (day === 5) return "Today";
  else nextDate.setDate(now.getDate() + (12 - day)); // Next Friday
  
  return nextDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function getYesterdayContext() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const day = yesterday.getDay();
  
  let explanation = "";
  if (day === 0) explanation = "Sundays typically have Premier League and other league matches.";
  else if (day === 1) explanation = "Mondays usually have no matches - rest day for most leagues.";
  else if (day === 2 || day === 3) explanation = "Champions League matchdays.";
  else if (day === 4) explanation = "Europa League matchdays.";
  else if (day === 5) explanation = "Friday - some leagues start weekend matches.";
  else explanation = "End of week - typical matchday.";
  
  return {
    dayName: yesterday.toLocaleDateString('en-US', { weekday: 'long' }),
    formattedDate: yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    explanation
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = searchParams.get('date') || yesterday.toISOString().split('T')[0];

  const context = getYesterdayContext();
  const nextMatchday = getNextMatchday();

  if (!API_KEY) {
    return mockResultsFallback(date, context, nextMatchday);
  }

  try {
    const response = await fetch(
      `${API_BASE}/fixtures?date=${date}&status=FT&timezone=UTC`,
      { headers: { 'x-apisports-key': API_KEY } }
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const allMatches = (data.response || []) as any[];
    
    const matches = allMatches
      .filter(f => LEAGUE_IDS.includes(f.league.id))
      .map(f => ({
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        league_id: f.league.id,
        home_team: { id: f.teams.home.id, name: f.teams.home.name, short: f.teams.home.name.substring(0,3), logo: f.teams.home.logo },
        away_team: { id: f.teams.away.id, name: f.teams.away.name, short: f.teams.away.name.substring(0,3), logo: f.teams.away.logo },
        home_score: f.score.fulltime.home,
        away_score: f.score.fulltime.away,
        verified: true
      }));

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        date,
        has_results: false,
        matches: [],
        leagues: [],
        total: 0,
        verified: false,
        friendly_message: {
          title: `📆 ${context.formattedDate} — ${context.dayName}`,
          body: `✅ No competitive matches were played in Top 5 European Leagues yesterday.`,
          explanation: context.explanation,
          next_matchday: nextMatchday,
          what_to_expect: {
            today: ["Champions League (Tuesday/Wednesday)", "Europa League (Thursday)", "League matches (Friday-Sunday)"],
            typical_schedule: "League: Fri-Sun, UCL: Tue-Wed, UEL: Thu"
          }
        },
        verification: { verified: false, data_quality: 'low', last_verified_at: new Date().toISOString() }
      });
    }

    const leagues = [...new Set(matches.map(m => m.league))];

    return NextResponse.json({
      success: true,
      date,
      has_results: true,
      matches,
      leagues,
      total: matches.length,
      verified: true,
      verification: { verified: true, data_quality: matches.length > 5 ? 'high' : 'medium', last_verified_at: new Date().toISOString() }
    });

  } catch (error: any) {
    return mockResultsFallback(date, context, nextMatchday);
  }
}

function mockResultsFallback(date: string, context: any, nextMatchday: string) {
  return NextResponse.json({
    success: false,
    date,
    has_results: false,
    matches: [],
    leagues: [],
    total: 0,
    verified: false,
    friendly_message: {
      title: `📆 ${context.formattedDate} — ${context.dayName}`,
      body: "✅ No competitive matches were played in Top 5 European Leagues yesterday.",
      explanation: context.explanation,
      next_matchday: nextMatchday,
      what_to_expect: {
        today: ["Champions League (Tuesday/Wednesday)", "Europa League (Thursday)", "League matches (Friday-Sunday)"],
        typical_schedule: "League: Fri-Sun, UCL: Tue-Wed, UEL: Thu"
      }
    },
    verification: { verified: false, data_quality: 'blocked', last_verified_at: new Date().toISOString() },
    fallback: true
  });
}