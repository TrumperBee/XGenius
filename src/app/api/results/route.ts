import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';
import { generatePrediction } from '@/lib/predictionEngine';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'xgenius-b8ffe';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function getCachedStats(teamId: string, season: string) {
  if (!FIREBASE_API_KEY) return null;
  try {
    const url = `${FIRESTORE_BASE}/team_stats_cache/${teamId}_${season}?key=${FIREBASE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const fields = data.fields || {};
    const result: any = {};
    for (const key in fields) {
      const f = fields[key];
      if (f.stringValue !== undefined) result[key] = f.stringValue;
      else if (f.integerValue !== undefined) result[key] = parseInt(f.integerValue);
      else if (f.doubleValue !== undefined) result[key] = parseFloat(f.doubleValue);
      else if (f.mapValue) {
        result[key] = {};
        for (const k in f.mapValue.fields || {}) {
          const sf = f.mapValue.fields[k];
          if (sf.stringValue !== undefined) result[key][k] = sf.stringValue;
          else if (sf.integerValue !== undefined) result[key][k] = parseInt(sf.integerValue);
          else if (sf.doubleValue !== undefined) result[key][k] = parseFloat(sf.doubleValue);
        }
      }
    }
    return result;
  } catch {
    return null;
  }
}

async function getTeamStats(teamId: string, season: string) {
  const cached = await getCachedStats(teamId, season);
  if (cached) return cached;

  if (!API_KEY) return null;
  try {
    const response = await fetch(`${API_BASE}/teams/statistics?team=${teamId}&league=&season=${season}`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    const data = await response.json();
    const stats = data.response;
    if (!stats || !stats.fixtures) return null;
    return {
      teamId: parseInt(teamId),
      teamName: stats.team?.name || '',
      leagueId: stats.league?.id || 0,
      leagueName: stats.league?.name || '',
      gamesPlayed: stats.fixtures?.played?.total || 0,
      wins: stats.fixtures?.wins?.total || 0,
      draws: stats.fixtures?.draws?.total || 0,
      losses: stats.fixtures?.losses?.total || 0,
      goalsFor: stats.goals?.for?.total?.total || 0,
      goalsAgainst: stats.goals?.against?.total?.total || 0,
      goalDifference: (stats.goals?.for?.total?.total || 0) - (stats.goals?.against?.total?.total || 0),
      cleanSheets: stats.clean_sheet?.total || 0,
      homeRecord: {
        played: stats.fixtures?.played?.home || 0,
        wins: stats.fixtures?.wins?.home || 0,
        draws: stats.fixtures?.draws?.home || 0,
        losses: stats.fixtures?.losses?.home || 0,
        goalsFor: stats.goals?.for?.total?.home || 0,
        goalsAgainst: stats.goals?.against?.total?.home || 0
      },
      awayRecord: {
        played: stats.fixtures?.played?.away || 0,
        wins: stats.fixtures?.wins?.away || 0,
        draws: stats.fixtures?.draws?.away || 0,
        losses: stats.fixtures?.losses?.away || 0,
        goalsFor: stats.goals?.for?.total?.away || 0,
        goalsAgainst: stats.goals?.against?.total?.away || 0
      },
      position: stats.league?.position || null
    };
  } catch {
    return null;
  }
}

function evaluatePrediction(prediction: any, homeScore: number, awayScore: number) {
  const actualWinner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
  const winnerCorrect = prediction.predictedWinner === actualWinner;
  const scoreCorrect = prediction.correctScore === `${homeScore}-${awayScore}`;
  const overUnderCorrect = (prediction.overUnder === 'over' && homeScore + awayScore > 2.5) ||
                          (prediction.overUnder === 'under' && homeScore + awayScore <= 2.5);
  const bttsCorrect = (prediction.btts === 'yes' && homeScore > 0 && awayScore > 0) ||
                       (prediction.btts === 'no' && (homeScore === 0 || awayScore === 0));
  const correctPredictions = [winnerCorrect, scoreCorrect, overUnderCorrect, bttsCorrect].filter(Boolean).length;
  return {
    winnerCorrect,
    scoreCorrect,
    overUnderCorrect,
    bttsCorrect,
    accuracy: (correctPredictions / 4) * 100,
    totalGoals: homeScore + awayScore,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = searchParams.get('date') || yesterday.toISOString().split('T')[0];

  try {
    const response = await fetch(
      `${API_BASE}/fixtures?date=${date}&status=FT&timezone=UTC`,
      { headers: { 'x-apisports-key': API_KEY }, signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const allMatches = (data.response || []) as any[];
    
    const matches = allMatches.filter(f => ALLOWED_LEAGUE_IDS.includes(f.league.id));

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        date,
        has_results: false,
        matches: [],
        leagues: [],
        total: 0,
        verified: false,
        stats: { correct: 0, total: 0, accuracy: 0 },
        friendly_message: {
          title: `${date}`,
          body: "No competitive matches were played in our tracked leagues.",
          explanation: "This may be due to an international break, off-season, or rest day.",
        },
      });
    }

    const season = '2024';

    const teamIds = [...new Set(matches.flatMap(f => [String(f.teams.home.id), String(f.teams.away.id)]))];
    const statsCache: Record<string, any> = {};
    
    const statsPromises = teamIds.map(async (id) => {
      const stats = await getTeamStats(id, season);
      if (stats) statsCache[id] = stats;
    });
    await Promise.all(statsPromises);

    const processedMatches = matches.map(f => {
      const homeScore = f.score.fulltime.home ?? 0;
      const awayScore = f.score.fulltime.away ?? 0;
      
      const homeStats = statsCache[String(f.teams.home.id)] || null;
      const awayStats = statsCache[String(f.teams.away.id)] || null;

      const pred = generatePrediction({
        homeTeam: { id: f.teams.home.id, name: f.teams.home.name },
        awayTeam: { id: f.teams.away.id, name: f.teams.away.name },
        league: { id: f.league.id, name: f.league.name },
        homeStats: homeStats,
        awayStats: awayStats,
        homeForm: null,
        awayForm: null,
        h2hFixtures: [],
        h2hSummary: { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } }
      });

      const evaluation = evaluatePrediction(pred, homeScore, awayScore);
      
      return {
        id: f.fixture.id,
        date: f.fixture.date,
        league: f.league.name,
        league_id: f.league.id,
        home_team: { 
          id: f.teams.home.id, 
          name: f.teams.home.name, 
          short: f.teams.home.name.substring(0,3).toUpperCase(), 
          logo: f.teams.home.logo 
        },
        away_team: { 
          id: f.teams.away.id, 
          name: f.teams.away.name, 
          short: f.teams.away.name.substring(0,3).toUpperCase(), 
          logo: f.teams.away.logo 
        },
        home_score: homeScore,
        away_score: awayScore,
        prediction: {
          predictedWinner: pred.predictedWinner,
          homeWin: pred.homeWin,
          draw: pred.draw,
          awayWin: pred.awayWin,
          correctScore: pred.correctScore,
          homeGoals: pred.homeGoals,
          awayGoals: pred.awayGoals,
          confidence: pred.confidence,
          overUnder: pred.overUnder,
          btts: pred.btts,
          expectedHomeGoals: pred.expectedHomeGoals,
          expectedAwayGoals: pred.expectedAwayGoals,
          dataQuality: pred.dataQuality
        },
        evaluation,
        verified: true
      };
    });

    const leagues = [...new Set(processedMatches.map(m => m.league))];
    const correctWinners = processedMatches.filter(m => m.evaluation.winnerCorrect).length;
    const totalAccuracy = processedMatches.reduce((sum, m) => sum + m.evaluation.accuracy, 0) / processedMatches.length;

    return NextResponse.json({
      success: true,
      date,
      has_results: true,
      matches: processedMatches,
      leagues,
      total: processedMatches.length,
      verified: true,
      stats: {
        correct: correctWinners,
        total: processedMatches.length,
        accuracy: Math.round(totalAccuracy),
        winnerAccuracy: Math.round((correctWinners / processedMatches.length) * 100),
      },
    });

  } catch (error: any) {
    console.error('Results API error:', error);
    return NextResponse.json({
      success: false,
      date,
      has_results: false,
      matches: [],
      leagues: [],
      total: 0,
      verified: false,
      stats: { correct: 0, total: 0, accuracy: 0 },
      friendly_message: {
        title: `${date}`,
        body: "Unable to fetch results. Please check back later.",
        explanation: "The data API may be temporarily unavailable.",
      },
    });
  }
}
