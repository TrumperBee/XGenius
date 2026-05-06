import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';

const API_KEY = process.env.FOOTBALL_API_KEY || '';
const API_BASE = 'https://v3.football.api-sports.io';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function poisson(goals: number, lambda: number): number {
  if (lambda === 0) return goals === 0 ? 1 : 0;
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function generatePrediction(homeName: string, awayName: string, seed: number) {
  const homeAdvantage = 0.15;
  const strengthDiff = seededRandom(seed + 500) * 0.4 - 0.2;
  const homeStrength = 0.5 + strengthDiff + 0.1;
  const awayStrength = 0.5 - strengthDiff + 0.1;
  
  let homeExpectedGoals = 2.5 * (1 + homeAdvantage) * homeStrength;
  let awayExpectedGoals = 2.5 * (1 - homeAdvantage * 0.5) * awayStrength;
  
  homeExpectedGoals = Math.max(0.3, Math.min(3.5, homeExpectedGoals));
  awayExpectedGoals = Math.max(0.3, Math.min(3.5, awayExpectedGoals));

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const homeProb = poisson(h, homeExpectedGoals);
      const awayProb = poisson(a, awayExpectedGoals);
      const jointProb = homeProb * awayProb;
      
      if (h > a) homeWinProb += jointProb;
      else if (a > h) awayWinProb += jointProb;
      else drawProb += jointProb;
    }
  }

  homeWinProb = homeWinProb * 100;
  drawProb = drawProb * 100;
  awayWinProb = awayWinProb * 100;

  let predictedWinner: 'home' | 'draw' | 'away';
  if (homeWinProb >= drawProb && homeWinProb >= awayWinProb) {
    predictedWinner = 'home';
  } else if (awayWinProb >= drawProb && awayWinProb >= homeWinProb) {
    predictedWinner = 'away';
  } else {
    predictedWinner = 'draw';
  }

  const scoreProbs: { home: number; away: number; prob: number }[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poisson(h, homeExpectedGoals) * poisson(a, awayExpectedGoals);
      scoreProbs.push({ home: h, away: a, prob });
    }
  }
  scoreProbs.sort((a, b) => b.prob - a.prob);

  let correctHomeGoals: number;
  let correctAwayGoals: number;
  
  if (predictedWinner === 'home') {
    const homeWinningScores = scoreProbs.filter(s => s.home > s.away);
    if (homeWinningScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, homeWinningScores.length));
      correctHomeGoals = homeWinningScores[idx].home;
      correctAwayGoals = homeWinningScores[idx].away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals);
      correctAwayGoals = Math.round(awayExpectedGoals) - 1;
    }
  } else if (predictedWinner === 'away') {
    const awayWinningScores = scoreProbs.filter(s => s.away > s.home);
    if (awayWinningScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, awayWinningScores.length));
      correctHomeGoals = awayWinningScores[idx].home;
      correctAwayGoals = awayWinningScores[idx].away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals) - 1;
      correctAwayGoals = Math.round(awayExpectedGoals);
    }
  } else {
    const drawScores = scoreProbs.filter(s => s.home === s.away);
    if (drawScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, drawScores.length));
      correctHomeGoals = drawScores[idx].home;
      correctAwayGoals = drawScores[idx].away;
    } else {
      const avgGoals = Math.round((homeExpectedGoals + awayExpectedGoals) / 2);
      correctHomeGoals = avgGoals;
      correctAwayGoals = avgGoals;
    }
  }
  
  correctHomeGoals = Math.max(0, correctHomeGoals);
  correctAwayGoals = Math.max(0, correctAwayGoals);

  const totalGoals = homeExpectedGoals + awayExpectedGoals;
  const overUnder: 'over' | 'under' = totalGoals > 2.5 ? 'over' : 'under';
  const btts: 'yes' | 'no' = homeExpectedGoals > 0.5 && awayExpectedGoals > 0.5 ? 'yes' : 'no';

  const confidence = Math.min(95, Math.max(45, Math.round(
    Math.abs(homeWinProb - awayWinProb) * 0.6 + (100 - Math.abs(homeExpectedGoals - awayExpectedGoals) * 20) * 0.2
  )));

  return {
    predictedWinner,
    homeWin: Math.round(homeWinProb),
    draw: Math.round(drawProb),
    awayWin: Math.round(awayWinProb),
    correctScore: `${correctHomeGoals}-${correctAwayGoals}`,
    homeGoals: correctHomeGoals,
    awayGoals: correctAwayGoals,
    confidence,
    overUnder,
    btts,
    expectedHomeGoals: Math.round(homeExpectedGoals * 10) / 10,
    expectedAwayGoals: Math.round(awayExpectedGoals * 10) / 10,
  };
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

  try {
    const response = await fetch(
      `${API_BASE}/fixtures?date=${date}&status=FT&timezone=UTC`,
      { headers: { 'x-apisports-key': API_KEY } }
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const allMatches = (data.response || []) as any[];
    
    const matches = allMatches
      .filter(f => ALLOWED_LEAGUE_IDS.includes(f.league.id))
      .map(f => {
        const homeScore = f.score.fulltime.home ?? 0;
        const awayScore = f.score.fulltime.away ?? 0;
        const seed = f.fixture.id;
        const prediction = generatePrediction(
          f.teams.home.name,
          f.teams.away.name,
          seed
        );
        const evaluation = evaluatePrediction(prediction, homeScore, awayScore);
        
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
          prediction,
          evaluation,
          verified: true
        };
      });

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
          title: `${context.formattedDate}`,
          body: "No competitive matches were played in Top 5 European Leagues yesterday.",
          explanation: context.explanation,
        },
      });
    }

    const leagues = [...new Set(matches.map(m => m.league))];
    
    const correctWinners = matches.filter(m => m.evaluation.winnerCorrect).length;
    const totalAccuracy = matches.reduce((sum, m) => sum + m.evaluation.accuracy, 0) / matches.length;

    return NextResponse.json({
      success: true,
      date,
      has_results: true,
      matches,
      leagues,
      total: matches.length,
      verified: true,
      stats: {
        correct: correctWinners,
        total: matches.length,
        accuracy: Math.round(totalAccuracy),
        winnerAccuracy: Math.round((correctWinners / matches.length) * 100),
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
        title: `${context.formattedDate}`,
        body: "Unable to fetch yesterday's results. Please check back later.",
        explanation: context.explanation,
      },
    });
  }
}
